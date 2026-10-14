# Marca do software e identificação empresarial

Silex Business permanece a marca fixa do produto. company_name identifica a empresa cliente. brand_name conserva a finalidade de nome de apresentação configurável por compatibilidade, sem substituir nome empresarial, razão social, emitente ou marca do software.

| Local atual | Uso de brand_name |
| --- | --- |
| frontend/src/settings.tsx:21 | Valor enviado no mesmo payload PUT de configuração |
| frontend/src/settings.tsx:25 | Campo Nome de apresentação, required e maxLength=50 |
| frontend/src/types.ts:10 | Propriedade do contrato CompanySettings |
| backend/app/models.py:42 | String(50), default Gestão, preservado |
| backend/app/schemas.py:37 | min_length=1, max_length=50 e default Gestão, preservados |
| backend/app/api.py:116 | Resposta padrão quando não há configuração persistida; os handlers GET/PUT serializam o modelo |
| backend/migrations/versions/0008_company_settings.py:15 | Definição histórica, preservada; nenhuma migração executada |

Depois do SB-02.2, não há consumidor visual de brand_name em logo, cabeçalho, breadcrumb ou rodapé. App.tsx mostra company_name no workspace e usa Minha empresa quando ele está vazio; não aplica brand_name como fallback. As referências literais Gestão nos recibos e templates financeiros não consomem brand_name e continuam reservadas ao SB-05/06.

## Recomendação

Manter o rótulo Nome de apresentação e o campo editável compatível. Qualquer uso futuro deve ser secundário e explicitamente identificado como nome de apresentação; company_name continua sendo a identificação empresarial principal e a marca permanece Silex Business. Não gerar dados empresariais a partir do nome de apresentação, usuário ou produto. Uma mudança de obrigatoriedade ou contrato exige um incremento próprio.

Os testes em banco descartável verificam brand_name Gestão com company_name vazio e depois os dois campos preenchidos com valores diferentes. Logo/título Silex permanecem fixos, o workspace segue company_name, os outros dados empresariais permanecem iguais e o payload conserva as mesmas chaves. Nenhum dado real foi regravado.
