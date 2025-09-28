### Instalation

```
python -m venv .venv && source .venv/bin/activate
pip install fastapi uvicorn "pydantic>=2" python-multipart playwright
python -m playwright install chromium

```

### Run
```
uvicorn app:app --reload --port 8000
```


#### Login Types
- OICD: https://learn.microsoft.com/de-de/entra/identity-platform/v2-protocols-oidc
- SAML: https://learn.microsoft.com/de-de/entra/identity-platform/singl     e-sign-on-saml-protocol
