"use client";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { demonstrationCatalog } from "./declarative-generative-ui/renderers";
import { useState, createContext, useContext } from "react";

type AppState = {
  hasInverter: boolean;
  setHasInverter: (val: boolean) => void;
};

export const AppContext = createContext<AppState>({
  hasInverter: false,
  setHasInverter: () => {},
});

export function useAppContext() {
  return useContext(AppContext);
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [hasInverter, setHasInverter] = useState(false);

  return (
    <html lang="en">
      <head>
        <title>Edison My Sun</title>
        <link rel="icon" type="image/svg+xml" href="/edison-logo.png" />
      </head>
      <body className="antialiased">
        <CopilotKit
          runtimeUrl="/api/copilotkit"
          inspectorDefaultAnchor={{ horizontal: "right", vertical: "top" }}
          a2ui={{ catalog: demonstrationCatalog }}
          openGenerativeUI={{}}
          useSingleEndpoint={false}
        >
          <AppContext.Provider value={{ hasInverter, setHasInverter }}>
            {children}
          </AppContext.Provider>
        </CopilotKit>
      </body>
    </html>
  );
}
