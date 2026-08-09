/**
 * SplashScreen.jsx
 * Full-screen branded loading screen shown while Electron initialises
 * and Supabase auth session is being resolved.
 *
 * Usage in App.jsx:
 *   import SplashScreen from "./components/SplashScreen";
 *   ...
 *   if (loading) return <SplashScreen />;
 *
 * The component reads the app version via the same electronAPI bridge
 * used by LoginPage so both always show the same version string.
 */

import { useState, useEffect } from "react";
import iecesLogo from "../image/ieceslogo.png";
import "./SplashScreen.css";

export default function SplashScreen() {
  const [appVersion, setAppVersion] = useState("");
  const [dots, setDots] = useState(""); // animated "Loading…" dots

  useEffect(() => {
    if (window?.ipc?.getVersion) {
      window.ipc.getVersion().then(setAppVersion).catch(() => {});
    }
  }, []);

  // Animate the ellipsis: . → .. → ... → (repeat)
  useEffect(() => {
    const id = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 420);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="splash-root">
      {/* Pulsing rings — same as LoginPage */}
      <div className="splash-ring ring-1" />
      <div className="splash-ring ring-2" />
      <div className="splash-ring ring-3" />

      {/* Logo */}
      <div className="splash-logo-wrap">
        <img src={iecesLogo} alt="IECES Logo" className="splash-logo" />
      </div>

      {/* School name */}
      <h1 className="splash-school">
        Isabela East Central
        <br />
        Elementary School
      </h1>
      <p className="splash-division">Division of Isabela City</p>

      {/* Spinner + status text */}
      <div className="splash-status">
        <div className="splash-spinner" />
        <span className="splash-loading-text">
          Starting up{dots}
        </span>
      </div>

      {/* Version — bottom center */}
      {appVersion && (
        <div className="splash-version">v{appVersion}</div>
      )}
    </div>
  );
}
