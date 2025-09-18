# 🔐 Credenciais Atualizadas - USEKAYLLA

## ✅ **Mudança Implementada**

O login do visualizador foi alterado de `visualizador` para `demo` para facilitar o acesso.

## 📋 **Credenciais Atuais**

| **Perfil** | **Login** | **Senha** | **Email** | **Status** |
|------------|-----------|-----------|-----------|------------|
| **Administrador** | `admin` | `admin123` | `admin@usekaylla.com` | ✅ Ativo |
| **Usuário** | `usuario` | `user123` | `usuario@usekaylla.com` | ✅ Ativo |
| **Demonstração** | `demo` | `demo123` | `demo@usekaylla.com` | ✅ Ativo |

## 🔄 **Compatibilidade**

- ✅ **Login antigo `visualizador`** ainda funciona (compatibilidade)
- ✅ **Login novo `demo`** funciona normalmente
- ✅ **Ambos usam a mesma conta** (role: viewer)

## 🎯 **Vantagens da Mudança**

- **Mais rápido**: `demo` (4 letras) vs `visualizador` (12 letras)
- **Mais intuitivo**: "demo" é universalmente reconhecido
- **Mais prático**: Fácil de digitar e lembrar
- **Compatível**: Login antigo ainda funciona

## 🧪 **Como Testar**

1. **Teste o novo login**: `demo` / `demo123`
2. **Teste o login antigo**: `visualizador` / `view123` (ainda funciona)
3. **Verifique o acesso**: Ambos devem funcionar normalmente

## 📝 **Outras Opções Disponíveis**

Se quiser mudar para outra opção, aqui estão as alternativas:

| **Opção** | **Login** | **Senha Sugerida** | **Tamanho** |
|-----------|-----------|-------------------|-------------|
| `view` | `view` | `view123` | 4 letras |
| `guest` | `guest` | `guest123` | 5 letras |
| `test` | `test` | `test123` | 4 letras |
| `see` | `see` | `see123` | 3 letras |
| `show` | `show` | `show123` | 4 letras |

## 🔧 **Para Alterar Novamente**

Se quiser usar outra opção, edite o arquivo `src/components/Account.tsx` na linha 38:

```typescript
{
  email: 'NOVO_LOGIN@usekaylla.com',
  password: 'NOVA_SENHA',
  name: 'NOVO_NOME',
  role: 'viewer'
}
```

## ✅ **Status da Implementação**

- ✅ Código atualizado
- ✅ Compatibilidade mantida
- ✅ Testes funcionando
- ✅ Documentação atualizada

**A mudança está pronta para uso! Agora você pode usar `demo` / `demo123` para acessar a conta de demonstração.**
