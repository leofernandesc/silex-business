"""Bound untrusted request bodies before JSON/OFX parsing, without logging their content."""
import asyncio
import time
from starlette.exceptions import HTTPException
from starlette.responses import JSONResponse

MAX_REQUEST_BYTES = 10 * 1024 * 1024  # Existing OFX maximum; base64 attachments fit below this.
BODY_TIMEOUT_SECONDS = 30


class RequestBodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or not scope.get('path','').startswith('/api/') or scope['method'] not in ('POST','PUT','PATCH','DELETE'):
            return await self.app(scope, receive, send)
        length = dict(scope.get('headers',())).get(b'content-length')
        if length is not None:
            try:
                size = int(length)
                if size < 0:
                    raise ValueError()
            except ValueError:
                return await JSONResponse({'detail':'Tamanho da solicitação inválido'},status_code=400)(scope,receive,send)
            if size > MAX_REQUEST_BYTES:
                return await JSONResponse({'detail':'Solicitação excede o limite de 10 MB'},status_code=413)(scope,receive,send)
        consumed = 0
        deadline = time.monotonic() + BODY_TIMEOUT_SECONDS

        async def bounded_receive():
            nonlocal consumed
            remaining = deadline - time.monotonic()
            try:
                if remaining <= 0:
                    raise TimeoutError()
                message = await asyncio.wait_for(receive(),remaining)
            except TimeoutError:
                raise HTTPException(408,'Tempo de envio excedido; nenhuma conclusão deve ser presumida') from None
            if message['type'] == 'http.request':
                consumed += len(message.get('body',b''))
                if consumed > MAX_REQUEST_BYTES:
                    raise HTTPException(413,'Solicitação excede o limite de 10 MB')
            return message
        await self.app(scope,bounded_receive,send)
