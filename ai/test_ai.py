"""
Prueba de conexion y latencia con Ollama.
Corre desde la raiz del repo:
    python test_ai.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from ai.ollama_provider import OllamaProvider


def main():
    print("\n  NetVault — Prueba de modelo local")
    print("  " + "─" * 40)

    provider = OllamaProvider(model="qwen2.5-coder:7b")

    print(f"\n  Modelo:    {provider.model_name()}")
    print(f"  Ollama:    http://localhost:11434")
    print(f"\n  Verificando disponibilidad...", end=" ", flush=True)

    if not provider.is_available():
        print("NO DISPONIBLE")
        print("\n  Posibles causas:")
        print("  - Ollama no está corriendo (ejecuta: ollama serve)")
        print(f"  - El modelo no está descargado (ejecuta: ollama pull {provider.model_name()})")
        return

    print("OK")

    print("\n  Midiendo latencia (prompt simple)...\n")
    result = provider.measure_latency("responde solo con la palabra: ok")

    print(f"  Primer token:     {result['time_to_first_token_ms']} ms")
    print(f"  Tiempo total:     {result['total_time_ms']} ms")
    print(f"  Tokens generados: {result['tokens_generated']}")

    print("\n  Prueba de chat (streaming)...")
    print("  " + "─" * 40)
    print("  Pregunta: ¿Qué es un decorador en Python? (respuesta corta)\n  ")

    messages = [
        {"role": "system", "content": "Eres un asistente técnico. Responde en español, de forma concisa."},
        {"role": "user",   "content": "¿Qué es un decorador en Python? Explícalo en 2 oraciones máximo."},
    ]

    print("  Respuesta: ", end="", flush=True)
    for token in provider.chat(messages, stream=True):
        print(token, end="", flush=True)

    print("\n\n  " + "─" * 40)
    print("  Prueba completada. El modelo está listo para integrarse en NetVault.\n")


if __name__ == "__main__":
    main()