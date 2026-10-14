"""Leitura OFX local e sem acesso a serviços bancários."""
import re
from datetime import date
from decimal import Decimal, InvalidOperation
from html import unescape

from fastapi import HTTPException


def decode_file(data: bytes) -> str:
    if len(data) > 10*1024*1024:
        raise HTTPException(413, 'Arquivo OFX excede 10 MB')
    if data.startswith((b'\xff\xfe',b'\xfe\xff')):
        try:
            return data.decode('utf-16')
        except UnicodeDecodeError:
            raise HTTPException(422, 'Arquivo OFX inválido')
    if b'\x00' in data:
        raise HTTPException(422, 'Arquivo OFX inválido')
    for encoding in ('utf-8-sig','utf-16','cp1252'):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise HTTPException(422, 'Não foi possível ler o texto do arquivo OFX')


def tag_value(block: str, name: str) -> str:
    match=re.search(rf'(?is)<{name}\b[^>]*>\s*([^<\r\n]*)',block)
    return unescape(match.group(1).strip()) if match else ''


def amount_to_cents(value: str) -> int:
    try:
        amount=Decimal(value.strip()).quantize(Decimal('0.01'))
    except (InvalidOperation, ValueError):
        raise HTTPException(422, 'Valor inválido em uma transação OFX')
    if amount == 0 or amount*100 != (Decimal(value.strip())*100):
        raise HTTPException(422, 'OFX deve informar valor não zero com até duas casas decimais')
    cents=int(amount*100)
    if abs(cents)>100_000_000_000:
        raise HTTPException(422, 'Valor da transação OFX acima do limite')
    return cents


def parse_ofx(data: bytes, today: date):
    text=decode_file(data)
    blocks=list(re.finditer(r'(?is)<STMTTRN\b[^>]*>(.*?)(?=</STMTTRN\s*>|<STMTTRN\b|</BANKTRANLIST\s*>|</OFX\s*>|$)',text))
    if not blocks:
        raise HTTPException(422, 'OFX sem transações bancárias STMTTRN')
    if len(blocks)>10000:
        raise HTTPException(422, 'Arquivo excede 10.000 transações')
    result=[]; seen=set()
    for match in blocks:
        block=match.group(1)
        fitid=tag_value(block,'FITID')
        raw_date=tag_value(block,'DTPOSTED')
        raw_amount=tag_value(block,'TRNAMT')
        if not fitid or len(fitid)>180 or not raw_date or not raw_amount:
            raise HTTPException(422, 'Transação OFX sem identificador, data ou valor')
        if fitid in seen:
            raise HTTPException(422, 'FITID repetido dentro do mesmo arquivo')
        seen.add(fitid)
        digits=re.match(r'^(\d{8})',raw_date.strip())
        if not digits:
            raise HTTPException(422, 'Data inválida em uma transação OFX')
        try: posted=date(int(digits[1][0:4]),int(digits[1][4:6]),int(digits[1][6:8]))
        except ValueError: raise HTTPException(422, 'Data inválida em uma transação OFX')
        if posted>today:
            raise HTTPException(422, 'OFX contém movimento futuro; confira a data antes de importar')
        result.append({'fitid':fitid,'posted_date':posted,'amount_cents':amount_to_cents(raw_amount),'name':tag_value(block,'NAME')[:180],'memo':tag_value(block,'MEMO')[:500]})
    return result
