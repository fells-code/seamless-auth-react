// src/custom-elements.ts

// Add typings for your custom element so TS doesn't complain in consumer apps
declare global {
  interface IntrinsicElements {
    "seamless-auth": React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement>,
      HTMLElement
    > & {
      "api-host": string;
    };
  }
}

// This file does not need to export anything
export {};
