# Free APIs for Background Worker

O worker em background está configurado para usar apenas APIs gratuitas para evitar custos. Aqui estão as opções disponíveis:

## APIs Gratuitas Disponíveis

### 1. **Groq** (Recomendado) ✅
- **Tier Gratuito**: Sim, generoso
- **Limite**: ~30 requests/minuto no tier gratuito
- **Velocidade**: Muito rápida (inferência acelerada)
- **Modelo**: `llama-3.1-8b-instant` (padrão)
- **Como obter**: https://console.groq.com/
- **Configuração**: Adicione `GROQ_API_KEY` no `.env`

### 2. **Hugging Face Inference API** ✅
- **Tier Gratuito**: Sim
- **Limite**: Generoso, mas pode ter rate limits ocasionais
- **Velocidade**: Variável (depende do modelo)
- **Modelo**: `mistralai/Mistral-7B-Instruct-v0.2` (padrão)
- **Como obter**: https://huggingface.co/settings/tokens
- **Configuração**: Adicione `HUGGINGFACE_API_KEY` no `.env`

### 3. **MockLLMProvider** (Fallback)
- **Custo**: Gratuito (sem API real)
- **Uso**: Retorna sugestões mockadas quando todas as APIs falharem
- **Quando usar**: Para desenvolvimento ou quando não há APIs configuradas

## Configuração do Worker

O worker está configurado para:

1. **Usar apenas APIs gratuitas** (`USE_FREE_APIS_ONLY = True`)
2. **Limite de tentativas**: Máximo 2 tentativas por prompt antes de pular
3. **Backoff exponencial**: Espera 2^retry_count segundos entre tentativas
4. **Skip automático**: Pula prompts que falharam após max tentativas

## Ordem de Fallback

```
1. Groq (se configurado)
   ↓ (se falhar)
2. Hugging Face (se configurado)
   ↓ (se falhar)
3. MockLLMProvider (sempre disponível)
```

## Como Configurar

### Groq (Recomendado)
```env
GROQ_API_KEY=seu_groq_api_key_aqui
GROQ_MODEL=llama-3.1-8b-instant
```

### Hugging Face
```env
HUGGINGFACE_API_KEY=seu_hf_token_aqui
HUGGINGFACE_MODEL=mistralai/Mistral-7B-Instruct-v0.2
```

## Comportamento do Worker

- **Não fica tentando infinitamente**: Máximo 2 tentativas por prompt
- **Pula prompts problemáticos**: Após max tentativas, pula para o próximo
- **Usa apenas APIs gratuitas**: Por padrão, não usa OpenAI no worker
- **Logs informativos**: Mostra qual API está sendo usada e quantos prompts foram pulados

## Desabilitar Worker

Se quiser desabilitar o worker completamente:
```python
WORKER_ENABLED = False  # Em agent_worker.py
```

## Usar OpenAI no Worker (NÃO RECOMENDADO)

Se quiser usar OpenAI no worker (vai gerar custos):
```python
USE_FREE_APIS_ONLY = False  # Em agent_worker.py
```

Mas lembre-se: isso pode gerar custos significativos se houver muitos prompts!
