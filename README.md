# Seamless Auth - Authentication and authorization for teams who want to get in front of users fast

📚 [Documentation](#documentation) - 🚀 [Getting Started](#getting-started) - 💬 [Feedback](#feedback)

## Documentation

- [Quickstart](https://seamlessauth.com/docs/seamless-auth-react/quickstart) - Learn to add Authentication to a React application in less than 5 mins.

- [FAQs](https://seamlessauth.com/faq/seamless-auth-react) - frequently asked questions about the Seamless Auth.

- [Docs site](https://www.seamlessauth.com/how-it-works/seamless-auth-react) - Documentation on how Seamless auth really works.

## Getting Started

Using [npm](https://npmjs.org/)

```bash
npm install seamless-auth-react
```

Using [yarn](https://yarnpkg.com/)

```bash
yarn add seamless-auth-react
```

<summary></summary>
<br>

Wrap your React app in the `AuthProvider` component:

```jsx
// src/index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { AuthProvider } from "seamless-auth-react";

// Best practice is to use your own backend server to proxy your Auth server an actual proxy server
const apiHost = "https://<your-seamless-auth-server-url>";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider apiHost={apiHost}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

Use the `useAuth` hook to access user information, authentication, and user management routines such as logout from any component.

```jsx
import { useAuth } from "seamless-auth-react";

function App() {
  const { user, logout } = useAuth();

  if (!user) {
    return <div>Please log in to access this content.</div>;
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h1>Welcome, {user.email}!</h1>
        <button className="App-link" onClick={logout}>
          Logout
        </button>
      </header>
    </div>
  );
}

export default App;
```

## Avaliable Features from useAuth

#### User - The information about your Seamless Auth user

#### login - Programatically call login

#### logout - Programmatically call logout

#### register - Programmatically call register

## Feedback

### Raise an issue

To provide feedback or report a bug, please [raise an issue on our issue tracker](https://github.com/fells-code/seamless-auth-react/issues).
