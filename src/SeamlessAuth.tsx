import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { SlotWrapper } from "SlotWrapper";

import { AuthProvider } from "./AuthProvider";
// @ts-expect-error Ignoring for now?
import styles from "./styles/index.css";

class SeamlessAuthElement extends HTMLElement {
  private shadow: ShadowRoot;
  private root?: ReactDOM.Root;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });

    // Inject styles once at construction
    const style = document.createElement("style");
    style.textContent = styles;
    this.shadow.appendChild(style);
  }

  connectedCallback() {
    // Clear previous content if any (for reconnects)
    this.shadow.querySelector("div#react-root")?.remove();

    const apiHost = this.getAttribute("api-host");
    if (!apiHost) {
      console.warn("Missing 'api-host' attribute on <seamless-auth>");
      return;
    }

    const container = document.createElement("div");
    container.id = "react-root";
    this.shadow.appendChild(container);

    // Mount React app inside shadow root container
    this.root = ReactDOM.createRoot(container);
    this.root.render(
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider apiHost={apiHost}>
          <SlotWrapper apiHost={apiHost} />
        </AuthProvider>
      </MemoryRouter>
    );
  }

  disconnectedCallback() {
    // Clean up React root on element removal
    this.root?.unmount();
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (name === "api-host" && oldValue !== newValue) {
      this.connectedCallback();
    }
  }

  static get observedAttributes() {
    return ["api-host"];
  }
}

customElements.define("seamless-auth", SeamlessAuthElement);
