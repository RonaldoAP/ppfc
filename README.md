# PPFC — Site de Votação: Melhor Uniforme

Site estático com votação em tempo real via **Firebase Realtime Database**.

## Como configurar (5 min)

### 1. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"** → dê um nome (ex: `ppfc-votacao`) → crie
3. No menu lateral → **Realtime Database** → **Criar banco de dados**
   - Escolha a região mais próxima (ex: `us-central1`)
   - Modo de início: **"Começar no modo de teste"** (permite leitura/escrita por 30 dias)
4. Vá em **Configurações do projeto** (⚙️) → role até **"Seus aplicativos"** → clique em **`</>`** (Web)
5. Registre o app e copie o objeto `firebaseConfig`

### 2. Colar a configuração no site

Abra `app.js` e substitua o bloco `firebaseConfig` pelo copiado do Firebase:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "ppfc-votacao.firebaseapp.com",
  databaseURL: "https://ppfc-votacao-default-rtdb.firebaseio.com",
  projectId: "ppfc-votacao",
  storageBucket: "ppfc-votacao.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...",
};
```

### 3. Adicionar imagens dos uniformes (opcional)

Crie a pasta `img/` e adicione as fotos com os nomes:
- `img/uniforme_1.jpg`
- `img/uniforme_2.jpg`
- `img/uniforme_3.jpg`
- `img/uniforme_goleiro.jpg`

Enquanto as imagens não existirem, o site exibe emojis como placeholder.

### 4. Personalizar os uniformes

Em `app.js`, edite o array `UNIFORMS` com os nomes e descrições corretos.

### 5. Publicar no GitHub Pages

```bash
git add .
git commit -m "site de votação PPFC"
git push
```

Em **Settings → Pages** → selecione o branch `main` → salve.

---

## Regras do Firebase (produção)

Quando quiser restringir o banco, substitua as regras em **Realtime Database → Regras** por:

```json
{
  "rules": {
    "votes": {
      ".read": true,
      "$uniform": {
        ".write": true,
        ".validate": "newData.isNumber() && newData.val() >= 0"
      }
    }
  }
}
```
