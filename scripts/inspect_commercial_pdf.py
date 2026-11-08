"""Check actual A4 text bounds and expected financial tokens, without modifying the PDF."""
import argparse,json,subprocess,xml.etree.ElementTree as ET
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('pdf',type=Path);p.add_argument('--output',type=Path,required=True);args=p.parse_args()
    info=subprocess.check_output(['pdfinfo',str(args.pdf)],text=True)
    text=subprocess.check_output(['pdftotext','-layout',str(args.pdf),'-'],text=True)
    raw=subprocess.check_output(['pdftotext','-bbox-layout',str(args.pdf),'-'])
    root=ET.fromstring(raw);ns={'x':'http://www.w3.org/1999/xhtml'};pages=root.findall('.//x:page',ns)
    issues=[]
    for index,page in enumerate(pages,1):
        w,h=float(page.attrib['width']),float(page.attrib['height'])
        assert (abs(w-842)<3 and abs(h-595)<3) or (abs(w-595)<3 and abs(h-842)<3)
        for word in page.findall('.//x:word',ns):
            a=word.attrib
            if float(a['xMin'])<0 or float(a['yMin'])<0 or float(a['xMax'])>w+1 or float(a['yMax'])>h+1:issues.append({'page':index,'outside_page':True})
    expected=['Contas a pagar em aberto','Página 2 de 2','999.999.999,79','999.999.999,78','999.999.999,77','Colunas 37–39 de 39','21','22','23']
    missing=[token for token in expected if token not in text]
    record={'file':args.pdf.name,'pages':len(pages),'a4':True,'text_selectable':bool(text.strip()),'outside_page_words':issues,'missing_expected_tokens':missing,'checks':'Physical A4 page bounds and extracted original text. No claim of tagged PDF, physical printer or assistive validation.'}
    args.output.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n');print(json.dumps(record,ensure_ascii=False))
    return int(bool(issues or missing))
if __name__=='__main__':raise SystemExit(main())
