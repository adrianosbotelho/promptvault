"""
Agent System Prompts.

System prompts for AI agents working with prompts in PromptVault.
"""

AGENT_SYSTEM_PROMPT = """Você é um assistente de IA especializado em engenharia de prompts e gerenciamento de prompts.

IMPORTANTE: Sempre responda em Português-BR (Brasileiro). Todas as suas respostas, sugestões, análises e explicações devem estar em português brasileiro.

Seu papel é ajudar usuários a criar, melhorar e gerenciar prompts de IA de forma eficaz. Você tem acesso a:
- O prompt atual em que está trabalhando
- Prompts similares da coleção do usuário (encontrados via busca semântica)
- Os prompts mais recentes no vault do usuário

Diretrizes:
1. **Análise de Prompts**: Analise prompts quanto à clareza, estrutura, eficácia e melhores práticas
2. **Sugestões de Melhoria**: Forneça sugestões específicas e acionáveis para melhorar prompts
3. **Consciência Contextual**: Use prompts similares e exemplos do vault para informar suas recomendações
4. **Melhores Práticas**: Aplique as melhores práticas de engenharia de prompts:
   - Instruções claras e definição de papel
   - Formatação e estrutura adequadas
   - Requisitos de saída específicos
   - Exemplos quando úteis
   - Considerações de tratamento de erros
   - Eficiência de tokens

5. **Consistência**: Mantenha consistência com o estilo de prompt existente do usuário quando apropriado
6. **Versionamento**: Entenda que os prompts são versionados e ajude os usuários a rastrear melhorias
7. **Compreensão Semântica**: Aproveite os resultados da busca semântica para encontrar padrões e exemplos relevantes

Ao fornecer assistência:
- Seja específico e acionável em suas sugestões
- Explique o raciocínio por trás das recomendações
- Referencie prompts similares quando relevante
- Considere o contexto e o caso de uso
- Equilibre a melhoria com a manutenção da intenção original
- Ajude os usuários a entender por que certas mudanças melhoram o prompt

Sempre procure ajudar os usuários a criar prompts mais eficazes, claros e confiáveis que produzam melhores resultados de modelos de IA."""


def build_agent_prompt_with_context(
    user_query: str,
    current_prompt_content: str = None,
    similar_prompts: list = None,
    latest_prompts: list = None
) -> str:
    """
    Build a complete prompt for the agent including context.
    
    Args:
        user_query: The user's question or request
        current_prompt_content: Content of the current prompt (if any)
        similar_prompts: List of similar prompts with similarity scores
        latest_prompts: List of latest prompts from the vault
        
    Returns:
        Complete prompt string ready to send to the LLM
    """
    prompt_parts = [AGENT_SYSTEM_PROMPT]
    prompt_parts.append("\n\n## Current Context\n")
    
    if current_prompt_content:
        prompt_parts.append("### Current Prompt\n")
        prompt_parts.append(f"```\n{current_prompt_content}\n```\n")
    
    if similar_prompts:
        prompt_parts.append(f"\n### Similar Prompts ({len(similar_prompts)} found)\n")
        for idx, similar in enumerate(similar_prompts, 1):
            similarity_pct = similar.similarity * 100
            prompt_parts.append(f"\n**{idx}. {similar.prompt.name}** (Similarity: {similarity_pct:.1f}%)\n")
            if similar.prompt.description:
                prompt_parts.append(f"Description: {similar.prompt.description}\n")
            
            # Get latest version content
            if similar.prompt.versions:
                latest_version = max(similar.prompt.versions, key=lambda v: v.version)
                prompt_parts.append(f"Content:\n```\n{latest_version.content}\n```\n")
    
    if latest_prompts:
        prompt_parts.append(f"\n### Latest Prompts in Vault ({len(latest_prompts)} most recent)\n")
        for idx, prompt in enumerate(latest_prompts[:5], 1):  # Show top 5
            prompt_parts.append(f"\n**{idx}. {prompt.name}**\n")
            if prompt.description:
                prompt_parts.append(f"Description: {prompt.description}\n")
            if prompt.versions:
                latest_version = max(prompt.versions, key=lambda v: v.version)
                content_preview = latest_version.content[:200] + "..." if len(latest_version.content) > 200 else latest_version.content
                prompt_parts.append(f"Content preview: {content_preview}\n")
    
    prompt_parts.append("\n\n## User Request\n")
    prompt_parts.append(user_query)
    
    return "\n".join(prompt_parts)


def build_simple_agent_prompt(user_query: str) -> str:
    """
    Build a simple agent prompt without context (for basic queries).
    
    Args:
        user_query: The user's question or request
        
    Returns:
        Complete prompt string
    """
    return f"{AGENT_SYSTEM_PROMPT}\n\n## User Request\n{user_query}"
