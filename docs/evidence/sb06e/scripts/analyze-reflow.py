"""Summarize measured layout defects without changing their severity or hiding overflow."""
from pathlib import Path
import json,os
E=Path(os.environ['SILEX_EVIDENCE']);data=json.loads((E/'surfaces.json').read_text());rows=data['rows']
normal=[r for r in rows if r['state']=='normal'];extra=[r for r in rows if r['state']!='normal'];defects=[]
for r in rows:
 if r['excess']<=1:continue
 outside=[n for n in r['overflow'] if not n['scrollAncestor']]
 leaves=[n for n in outside if n['selector'] not in ['main'] and not n['selector'].startswith('section.panel')]
 defects.append({'route':r['route'],'state':r['state'],'viewport':r['viewport'],'document':r['document'],'excess':r['excess'],'headerRight':r['header']['right'] if r['header'] else None,'outsideLocalScroll':outside,'representativeCauses':leaves[:12]})
(E/'reflow-findings.json').write_text(json.dumps(defects,ensure_ascii=False,indent=2))
lines=['# Matriz de responsividade e diagnóstico de conteúdo','','Medições atuais em `surfaces.json`/`reflow-findings.json`. Fonte ampliada = **fontes computadas do conteúdo main duplicadas**, não zoom nativo e não alteração do produto. Header fica fora dessa simulação e é validado nos testes R02. Overflow de uma tabela contida em região rolável não é contado automaticamente como falha da página.','','## Normal — viewport/documento CSS px','','| Tela |1440|1024|768|375|320|','|---|---|---|---|---|---|']
for route in dict.fromkeys(r['route'] for r in normal):
 values=[next(r for r in normal if r['route']==route and r['width']==w) for w in [1440,1024,768,375,320]]
 lines.append('|'+route+'|'+'|'.join(f"{r['viewport']}/{r['document']}" for r in values)+'|')
lines+=['','## Estados adicionais com excesso','','|Tela/estado|Disponível|Documento|Excesso|Header termina em|Causas fora de rolagem interna|','|---|---|---|---|---|---|']
for d in defects:
 causes='; '.join(f"`{x['selector']}` {x['rect']['width']}px / pai {x['available']}px" for x in d['representativeCauses'][:4])
 lines.append(f"|{d['route']} / {d['state']}|{d['viewport']}|{d['document']}|{d['excess']}|{d['headerRight']}|{causes}|")
lines+=['','## Interpretação e propostas para autorização','','A comparação dirigida com baseline registra larguras antes/depois em `baseline-reflow-comparison.json`. Como nenhuma fonte de produção muda neste incremento, os excessos não são regressões SB-06E. A causa de conteúdo é independente da correção R02 do cabeçalho. Não reabrir R02 por associação.','','- Grade/ações/filtros com mínimos intrínsecos: avaliar min-width:0, quebra controlada e redistribuição local, preservando ordem, rótulos, colunas e handlers. Risco moderado pela densidade/seletores compartilhados; validar todas as larguras, foco, datas e últimos controles. Não aplicar overflow-x:hidden.','- Texto/nome longo: avaliar quebra responsiva apenas no componente afetado, sem alterar nome persistido ou marca; testar strings sintéticas, fonte200 e menu/perfis.','- Quando um controle excede o viewport, testar se permanece alcançável por teclado e rolagem; não presumir que scrollWidth por si só comprova conteúdo perdido. Havendo controle essencial inacessível, classificar como bloqueador da homologação daquele fluxo.','- Critérios relevantes: WCAG1.4.10 para reflow e1.4.4 para ampliação sem perda.320CSSpx é referência horizontal de reflow;187/256 aqui são robustez adicional. A simulação de fonte não certifica esses critérios integralmente. Zoom nativo e leitores têm resultados/limites próprios.','','Nenhuma correção do produto foi executada. Acessibilidade global continua sem homologação; resultados de contraste/alvos são o recorte automatizado dos testes existentes.']
(Path(os.environ['SILEX_ROOT'])/'docs/silex-business/SB-06E/RESPONSIVIDADE.md').write_text('\n'.join(lines)+'\n')
print('Normal measurements',len(normal),'all states',len(rows),'overflow states',len(defects))
