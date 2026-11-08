"""Bound the ASGI body before an oversized payload reaches JSON/OFX parsers."""
import asyncio
from urllib.parse import urlsplit

import pytest
from sqlalchemy import func,select
from app.models import BankStatementImport,Customer


async def streamed(app, url, cookie, chunks, extra_headers=(), delay=0):
    address=urlsplit(url);sent=[];reads=0
    scope={'type':'http','asgi':{'version':'3.0','spec_version':'2.4'},'http_version':'1.1','method':'POST',
           'scheme':'http','path':address.path,'raw_path':address.path.encode(),'query_string':address.query.encode(),
           'headers':[(b'host',b'testserver'),(b'cookie',cookie.encode()),*extra_headers],
           'server':('testserver',80),'client':('127.0.0.1',4567),'root_path':''}
    async def receive():
        nonlocal reads
        await asyncio.sleep(delay)
        if reads>=len(chunks):return {'type':'http.disconnect'}
        body=chunks[reads];reads+=1
        return {'type':'http.request','body':body,'more_body':reads<len(chunks)}
    async def send(message):sent.append(message)
    await app(scope,receive,send)
    status=next(m['status'] for m in sent if m['type']=='http.response.start')
    return status,reads


@pytest.mark.parametrize('kind',['ofx','json'])
def test_chunked_payload_is_rejected_without_consuming_the_entire_upload(env,kind):
    app,admin,_,_=env
    bank=next(a for a in admin.get('/api/accounts').json() if a['kind']=='bank')
    path=f"/api/finance/ofx/imports?account_id={bank['id']}" if kind=='ofx' else '/api/customers'
    with app.state.sessions() as db:before=db.scalar(select(func.count(Customer.id)))
    chunk=b' '*1024*1024
    status,reads=asyncio.run(streamed(app,path,'gestao_session='+admin.cookies['gestao_session'],[chunk]*12))
    assert status==413
    assert reads<12  # Reject streaming overflow instead of allocating the full 12 MiB.
    with app.state.sessions() as db:
        assert db.scalar(select(func.count(BankStatementImport.id)))==0
        assert db.scalar(select(func.count(Customer.id)))==before


@pytest.mark.parametrize('length,expected',[(b'-1',400),(b'invalid',400),(b'10485761',413)])
def test_declared_body_limits_reject_before_read(env,length,expected):
    app,admin,_,_=env
    status,reads=asyncio.run(streamed(app,'/api/customers','gestao_session='+admin.cookies['gestao_session'],[b'{}'],[(b'content-length',length)]))
    assert (status,reads)==(expected,0)


def test_slow_body_fails_without_persisting_customer(env,monkeypatch):
    app,admin,_,_=env
    monkeypatch.setattr('app.request_limits.BODY_TIMEOUT_SECONDS',0.01)
    status,_=asyncio.run(streamed(app,'/api/customers','gestao_session='+admin.cookies['gestao_session'],[b'{"name":"Incomplete fixture"}'],delay=0.1))
    assert status==408
    with app.state.sessions() as db:assert db.scalar(select(func.count(Customer.id)))==0


def test_false_small_content_length_cannot_bypass_stream_limit(env):
    app,admin,_,_=env
    status,reads=asyncio.run(streamed(app,'/api/customers','gestao_session='+admin.cookies['gestao_session'],[b' '*1024*1024]*12,[(b'content-length',b'2')]))
    assert status==413 and reads<12
