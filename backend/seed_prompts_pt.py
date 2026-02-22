"""
Script para popular o banco de dados com prompts úteis em português para uso diário.
Categorias: Delphi, Oracle, Arquitetura
"""
import sys
from datetime import datetime

# Add the backend directory to the path
sys.path.insert(0, '.')

from app.core.database import SessionLocal
from app.models.database import Prompt, PromptVersion
from app.services.prompt_service import PromptService
from app.models.prompt import PromptCreate
from app.core.categories import PromptCategory, PromptTag


def seed_prompts_pt():
    """Popular banco de dados com prompts em português para uso diário."""
    db = SessionLocal()
    
    try:
        prompts_data = [
            # ========== DELPHI ==========
            {
                "name": "Debug de Erro em Delphi",
                "description": "Prompt para ajudar a debugar erros comuns em aplicações Delphi",
                "category": PromptCategory.DELPHI,
                "tags": [PromptTag.DEBUG, PromptTag.IMPLEMENTATION],
                "content": """Você é um especialista em Delphi. Ajude-me a debugar o seguinte erro:

Erro: {erro}
Código relacionado: {codigo}
Stack trace: {stack_trace}

Forneça:
1. Análise do erro e possível causa
2. Soluções sugeridas
3. Código corrigido se aplicável
4. Boas práticas para evitar esse tipo de erro no futuro"""
            },
            {
                "name": "Otimização de Performance em Delphi",
                "description": "Prompt para otimizar performance de código Delphi",
                "category": PromptCategory.DELPHI,
                "tags": [PromptTag.PERFORMANCE, PromptTag.IMPLEMENTATION],
                "content": """Você é um especialista em performance em Delphi. Analise o seguinte código e forneça recomendações de otimização:

Código:
{codigo}

Contexto: {contexto}

Forneça:
1. Identificação de gargalos de performance
2. Sugestões de otimização específicas
3. Código otimizado
4. Métricas esperadas de melhoria"""
            },
            {
                "name": "Arquitetura de Aplicação Delphi",
                "description": "Prompt para ajudar no design arquitetural de aplicações Delphi",
                "category": PromptCategory.DELPHI,
                "tags": [PromptTag.ARCHITECTURE, PromptTag.ANALYSIS],
                "content": """Você é um arquiteto de software especializado em Delphi. Ajude-me a projetar a arquitetura da seguinte aplicação:

Requisitos: {requisitos}
Escopo: {escopo}
Tecnologias disponíveis: {tecnologias}

Forneça:
1. Proposta de arquitetura (camadas, padrões)
2. Estrutura de pastas e organização
3. Padrões de design recomendados
4. Boas práticas específicas para Delphi
5. Considerações de escalabilidade e manutenibilidade"""
            },
            {
                "name": "Implementação de Funcionalidade Delphi",
                "description": "Prompt para implementar novas funcionalidades em Delphi",
                "category": PromptCategory.DELPHI,
                "tags": [PromptTag.IMPLEMENTATION],
                "content": """Você é um desenvolvedor experiente em Delphi. Implemente a seguinte funcionalidade:

Funcionalidade: {funcionalidade}
Requisitos: {requisitos}
Restrições: {restricoes}

Forneça:
1. Código completo e funcional
2. Explicação da implementação
3. Testes sugeridos
4. Considerações de manutenibilidade"""
            },
            
            # ========== ORACLE ==========
            {
                "name": "Otimização de Query Oracle",
                "description": "Prompt para otimizar queries SQL em Oracle",
                "category": PromptCategory.ORACLE,
                "tags": [PromptTag.PERFORMANCE, PromptTag.IMPLEMENTATION],
                "content": """Você é um DBA Oracle especialista em tuning. Otimize a seguinte query:

Query:
{query}

Plano de execução: {execution_plan}
Estatísticas da tabela: {table_stats}

Forneça:
1. Análise do plano de execução atual
2. Identificação de problemas de performance
3. Query otimizada
4. Sugestões de índices
5. Estimativa de melhoria de performance"""
            },
            {
                "name": "Debug de Problema Oracle",
                "description": "Prompt para debugar problemas em Oracle",
                "category": PromptCategory.ORACLE,
                "tags": [PromptTag.DEBUG, PromptTag.IMPLEMENTATION],
                "content": """Você é um DBA Oracle. Ajude-me a resolver o seguinte problema:

Problema: {problema}
Erro: {erro}
Logs: {logs}
Configuração atual: {config}

Forneça:
1. Diagnóstico do problema
2. Causa raiz identificada
3. Solução passo a passo
4. Comandos SQL/scripts necessários
5. Prevenção para o futuro"""
            },
            {
                "name": "Arquitetura de Banco Oracle",
                "description": "Prompt para design de arquitetura de banco de dados Oracle",
                "category": PromptCategory.ORACLE,
                "tags": [PromptTag.ARCHITECTURE, PromptTag.ANALYSIS],
                "content": """Você é um arquiteto de banco de dados Oracle. Projete a arquitetura para:

Requisitos: {requisitos}
Volume de dados: {volume}
Padrão de acesso: {acesso}
Recursos disponíveis: {recursos}

Forneça:
1. Estrutura de tabelas e relacionamentos
2. Estratégia de particionamento
3. Índices recomendados
4. Estratégia de backup e recovery
5. Considerações de segurança
6. Plano de monitoramento"""
            },
            {
                "name": "Implementação de Procedimento Oracle",
                "description": "Prompt para criar procedures e functions em Oracle",
                "category": PromptCategory.ORACLE,
                "tags": [PromptTag.IMPLEMENTATION],
                "content": """Você é um desenvolvedor PL/SQL experiente. Crie o seguinte procedimento/função:

Especificação: {especificacao}
Parâmetros: {parametros}
Lógica de negócio: {logica}
Tratamento de erros: {tratamento_erros}

Forneça:
1. Código PL/SQL completo
2. Comentários explicativos
3. Tratamento de exceções
4. Testes sugeridos
5. Considerações de performance"""
            },
            
            # ========== ARQUITETURA ==========
            {
                "name": "Análise de Arquitetura de Sistema",
                "description": "Prompt para analisar e avaliar arquiteturas de sistemas",
                "category": PromptCategory.ARQUITETURA,
                "tags": [PromptTag.ANALYSIS, PromptTag.ARCHITECTURE],
                "content": """Você é um arquiteto de software sênior. Analise a seguinte arquitetura:

Arquitetura atual: {arquitetura_atual}
Requisitos: {requisitos}
Tecnologias: {tecnologias}
Contexto: {contexto}

Forneça:
1. Análise de pontos fortes e fracos
2. Identificação de problemas arquiteturais
3. Riscos e vulnerabilidades
4. Recomendações de melhoria
5. Padrões arquiteturais aplicáveis"""
            },
            {
                "name": "Melhoria de Arquitetura",
                "description": "Prompt para propor melhorias em arquiteturas existentes",
                "category": PromptCategory.ARQUITETURA,
                "tags": [PromptTag.IMPROVEMENT, PromptTag.ARCHITECTURE],
                "content": """Você é um arquiteto de software. Proponha melhorias para a seguinte arquitetura:

Arquitetura atual: {arquitetura_atual}
Problemas identificados: {problemas}
Objetivos de melhoria: {objetivos}
Restrições: {restricoes}

Forneça:
1. Arquitetura proposta melhorada
2. Justificativa das mudanças
3. Plano de migração
4. Impacto nas funcionalidades existentes
5. Riscos e mitigações
6. Métricas de sucesso"""
            },
            {
                "name": "Design de API REST",
                "description": "Prompt para projetar APIs RESTful",
                "category": PromptCategory.ARQUITETURA,
                "tags": [PromptTag.ARCHITECTURE, PromptTag.IMPLEMENTATION],
                "content": """Você é um arquiteto de APIs. Projete uma API REST para:

Domínio: {dominio}
Funcionalidades: {funcionalidades}
Casos de uso: {casos_uso}
Requisitos não-funcionais: {requisitos}

Forneça:
1. Estrutura de endpoints (RESTful)
2. Modelos de dados (schemas)
3. Códigos de status HTTP apropriados
4. Estratégia de versionamento
5. Autenticação e autorização
6. Tratamento de erros
7. Documentação OpenAPI/Swagger"""
            },
            {
                "name": "Padrões de Design Aplicados",
                "description": "Prompt para aplicar padrões de design em soluções",
                "category": PromptCategory.ARQUITETURA,
                "tags": [PromptTag.ARCHITECTURE, PromptTag.IMPLEMENTATION],
                "content": """Você é um especialista em padrões de design. Aplique padrões apropriados para:

Problema: {problema}
Contexto: {contexto}
Tecnologias: {tecnologias}
Requisitos: {requisitos}

Forneça:
1. Padrões de design recomendados
2. Justificativa da escolha
3. Implementação do padrão
4. Exemplo de código
5. Trade-offs e alternativas"""
            },
        ]
        
        print("=" * 60)
        print("Populando banco com prompts em português...")
        print("=" * 60)
        
        created_count = 0
        skipped_count = 0
        
        for prompt_data in prompts_data:
            # Check if prompt already exists
            existing = db.query(Prompt).filter(Prompt.name == prompt_data["name"]).first()
            if existing:
                print(f"  ⏭  Prompt '{prompt_data['name']}' já existe, pulando...")
                skipped_count += 1
                continue
            
            # Create prompt using PromptService
            prompt_create = PromptCreate(
                name=prompt_data["name"],
                description=prompt_data["description"],
                category=prompt_data["category"],
                tags=prompt_data["tags"],
                content=prompt_data["content"].strip()
            )
            
            try:
                prompt = PromptService.create_prompt(db, prompt_create)
                print(f"  ✓ Criado: '{prompt.name}' ({prompt.category.value if prompt.category else 'sem categoria'})")
                created_count += 1
            except Exception as e:
                print(f"  ✗ Erro ao criar '{prompt_data['name']}': {e}")
                db.rollback()
                continue
        
        db.commit()
        
        print("\n" + "=" * 60)
        print(f"✓ Concluído!")
        print(f"  - Criados: {created_count} prompts")
        print(f"  - Pulados: {skipped_count} prompts")
        print("=" * 60)
        print("\nPrompts disponíveis por categoria:")
        print("  - Delphi: Debug, Performance, Arquitetura, Implementação")
        print("  - Oracle: Performance, Debug, Arquitetura, Implementação")
        print("  - Arquitetura: Análise, Melhoria, Design de API, Padrões")
        print("\nTeste o endpoint agrupado:")
        print("  GET /api/v1/prompts/grouped")
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Erro ao popular prompts: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    seed_prompts_pt()
