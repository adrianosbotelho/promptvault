"""
Script para testar a análise de um prompt e gerar insights.
"""
import sys
import requests
import json

# Configuração
BASE_URL = "http://127.0.0.1:8000"
PROMPT_ID = 15

def test_analyze_prompt():
    """Testa a análise de um prompt e verifica se os insights foram salvos."""
    
    print("=" * 60)
    print(f"Testando análise do prompt ID {PROMPT_ID}")
    print("=" * 60)
    
    # 1. Verificar insights antes da análise
    print("\n1. Verificando insights antes da análise...")
    response = requests.get(f"{BASE_URL}/api/v1/insights?prompt_id={PROMPT_ID}")
    insights_before = response.json()
    print(f"   Insights encontrados: {len(insights_before)}")
    
    # 2. Analisar o prompt
    print(f"\n2. Analisando prompt ID {PROMPT_ID}...")
    try:
        response = requests.post(f"{BASE_URL}/api/v1/agent/analyze/{PROMPT_ID}")
        if response.status_code == 200:
            suggestions = response.json()
            print(f"   ✓ Análise concluída!")
            print(f"   - Melhorias: {len(suggestions.get('improvement_ideas', []))}")
            print(f"   - Padrões: {len(suggestions.get('reusable_patterns', []))}")
            print(f"   - Avisos: {len(suggestions.get('warnings', []))}")
        else:
            print(f"   ✗ Erro na análise: {response.status_code}")
            print(f"   {response.text}")
            return
    except Exception as e:
        print(f"   ✗ Erro ao analisar: {e}")
        return
    
    # 3. Verificar insights depois da análise
    print("\n3. Verificando insights após a análise...")
    response = requests.get(f"{BASE_URL}/api/v1/insights?prompt_id={PROMPT_ID}")
    insights_after = response.json()
    print(f"   Insights encontrados: {len(insights_after)}")
    
    if len(insights_after) > len(insights_before):
        print(f"   ✓ Novo insight criado! (ID: {insights_after[0]['id']})")
        print(f"\n   Detalhes do insight:")
        print(f"   - ID: {insights_after[0]['id']}")
        print(f"   - Prompt ID: {insights_after[0]['prompt_id']}")
        print(f"   - Criado em: {insights_after[0]['created_at']}")
        print(f"   - Melhorias: {insights_after[0]['improvement_count']}")
        print(f"   - Padrões: {insights_after[0]['pattern_count']}")
        print(f"   - Avisos: {insights_after[0]['warning_count']}")
        print(f"   - Lido: {'Sim' if insights_after[0]['is_read'] else 'Não'}")
    else:
        print("   ⚠ Nenhum novo insight foi criado")
    
    print("\n" + "=" * 60)
    print("Teste concluído!")
    print("=" * 60)

if __name__ == "__main__":
    test_analyze_prompt()
