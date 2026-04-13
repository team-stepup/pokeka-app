"use client";

import { useState, useEffect, useCallback } from "react";
import { Lock, Fingerprint, Eye } from "lucide-react";

const PIN_HASH = "a]3k$0811#xZ"; // simple obfuscation
const AUTH_KEY = "pokeka_auth";
const BIO_KEY = "pokeka_bio_registered";

function verifyPin(input: string): boolean {
  return PIN_HASH.includes(input) && input === "0811";
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [showBioPrompt, setShowBioPrompt] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(AUTH_KEY);
    if (stored === "1") setAuthed(true);

    const bioReg = localStorage.getItem(BIO_KEY);
    if (bioReg === "1") setBioRegistered(true);

    // Check if WebAuthn / biometric is available
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((available) => {
        setBioAvailable(available);
        // Auto-trigger biometric if registered
        if (available && bioReg === "1" && stored !== "1") {
          triggerBiometric();
        }
      });
    }
    setLoading(false);
  }, []);

  const triggerBiometric = useCallback(async () => {
    try {
      const credentialId = localStorage.getItem("pokeka_cred_id");
      if (!credentialId) {
        setBioRegistered(false);
        localStorage.removeItem(BIO_KEY);
        return;
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
            type: "public-key",
            transports: ["internal"],
          }],
          userVerification: "required",
        },
      });

      if (credential) {
        sessionStorage.setItem(AUTH_KEY, "1");
        setAuthed(true);
      }
    } catch {
      // Biometric failed or cancelled - fall back to PIN
    }
  }, []);

  const registerBiometric = async () => {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: "PokeCard Manager", id: window.location.hostname },
          user: {
            id: crypto.getRandomValues(new Uint8Array(16)),
            name: "pokeka-user",
            displayName: "ポケカユーザー",
          },
          pubKeyCredParams: [{ alg: -7, type: "public-key" }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required",
          },
          timeout: 60000,
        },
      });

      if (credential) {
        const rawId = (credential as PublicKeyCredential).rawId;
        const credentialId = btoa(String.fromCharCode(...new Uint8Array(rawId)));
        localStorage.setItem("pokeka_cred_id", credentialId);
        localStorage.setItem(BIO_KEY, "1");
        setBioRegistered(true);
        setShowBioPrompt(false);
      }
    } catch {
      setShowBioPrompt(false);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPin(pin)) {
      sessionStorage.setItem(AUTH_KEY, "1");
      setAuthed(true);
      setError("");
      // Show biometric registration prompt if available and not registered
      if (bioAvailable && !bioRegistered) {
        setShowBioPrompt(true);
      }
    } else {
      setError("パスワードが違います");
      setPin("");
    }
  };

  const handlePinInput = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError("");
      if (newPin.length === 4) {
        // Auto-submit when 4 digits entered
        setTimeout(() => {
          if (verifyPin(newPin)) {
            sessionStorage.setItem(AUTH_KEY, "1");
            setAuthed(true);
            if (bioAvailable && !bioRegistered) {
              setShowBioPrompt(true);
            }
          } else {
            setError("パスワードが違います");
            setPin("");
          }
        }, 150);
      }
    }
  };

  if (loading) return null;

  // Biometric registration prompt
  if (showBioPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Fingerprint size={32} className="text-primary" />
          </div>
          <h2 className="text-xl font-bold mb-2">生体認証を設定</h2>
          <p className="text-sm text-muted mb-6">
            次回からFace ID / 指紋認証でログインできます
          </p>
          <button
            onClick={registerBiometric}
            className="w-full py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary-dark mb-3"
          >
            設定する
          </button>
          <button
            onClick={() => setShowBioPrompt(false)}
            className="w-full py-3 rounded-xl border border-border text-muted hover:bg-gray-50"
          >
            スキップ
          </button>
        </div>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={28} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold">PokeCard Manager</h1>
            <p className="text-sm text-muted mt-1">パスワードを入力してください</p>
          </div>

          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all ${
                  i < pin.length ? "bg-primary scale-110" : "bg-gray-200"
                }`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-danger text-sm mb-4">{error}</p>
          )}

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => handlePinInput(String(n))}
                className="h-14 rounded-xl text-xl font-medium bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              >
                {n}
              </button>
            ))}
            {bioAvailable && bioRegistered ? (
              <button
                onClick={triggerBiometric}
                className="h-14 rounded-xl flex items-center justify-center bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
              >
                <Eye size={24} className="text-primary" />
              </button>
            ) : (
              <div />
            )}
            <button
              onClick={() => handlePinInput("0")}
              className="h-14 rounded-xl text-xl font-medium bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            >
              0
            </button>
            <button
              onClick={() => setPin(pin.slice(0, -1))}
              className="h-14 rounded-xl text-sm text-muted bg-gray-50 hover:bg-gray-100 active:bg-gray-200"
            >
              削除
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
