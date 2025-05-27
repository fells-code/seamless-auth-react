/* eslint-disable @typescript-eslint/no-namespace */
// src/custom-elements.ts

// Add typings for your custom element so TS doesn't complain in consumer apps
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "seamless-auth": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
}

// This file does not need to export anything
export {};
