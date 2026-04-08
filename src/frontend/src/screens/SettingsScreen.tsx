import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  CheckCircle,
  Cloud,
  Fingerprint,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { clearSyncQueue, getPendingSyncCount } from "../lib/offlineSync";
import { THEMES, applyTheme } from "../lib/themes";

interface SettingsScreenProps {
  onBack: () => void;
  onThemeChange?: (themeId: string) => void;
  activeThemeId?: string;
}

export function SettingsScreen({
  onBack,
  onThemeChange,
  activeThemeId,
}: SettingsScreenProps) {
  const [cloudSync, setCloudSync] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(getPendingSyncCount);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const { identity, login, clear, isLoggingIn, isInitializing } =
    useInternetIdentity();

  const isLoggedIn = !!identity;

  // Refresh pending count when screen becomes visible
  useEffect(() => {
    setPendingSyncCount(getPendingSyncCount());
  }, []);

  const principalText = identity ? identity.getPrincipal().toText() : "";
  const shortPrincipal =
    principalText.length > 10
      ? `${principalText.slice(0, 5)}...${principalText.slice(-3)}`
      : principalText;

  function handleSyncNow() {
    clearSyncQueue();
    setPendingSyncCount(0);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2000);
  }

  const sectionHeaderStyle: React.CSSProperties = {
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "#9AA0A6",
    textTransform: "uppercase",
    paddingLeft: "4px",
    marginBottom: "8px",
    marginTop: "24px",
  };

  const rowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    background: "rgba(0,0,0,0.6)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "8px",
    border: "1px solid rgba(255,255,255,0.06)",
  };

  return (
    <div
      data-ocid="settings.page"
      className="min-h-screen relative z-10"
      style={{
        paddingLeft: "16px",
        paddingRight: "16px",
        paddingBottom: "calc(8vh + 32px)",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 0 8px 0",
        }}
      >
        <button
          type="button"
          data-ocid="settings.back.button"
          onClick={onBack}
          className="cursor-pointer transition-opacity hover:opacity-70"
          style={{
            background: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.09)",
            borderRadius: "10px",
            padding: "8px",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <h1
          className="font-bold text-white"
          style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
        >
          Settings
        </h1>
      </header>

      {/* Themes Section */}
      <div>
        <p style={{ ...sectionHeaderStyle, marginTop: "16px" }}>Themes</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              data-ocid={`settings.theme.${theme.id}.button`}
              onClick={() => {
                applyTheme(theme);
                onThemeChange?.(theme.id);
              }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "4px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: theme.isDay ? "#f5f0e8" : theme.accent,
                  border:
                    activeThemeId === theme.id
                      ? "2.5px solid #ffffff"
                      : "2.5px solid rgba(255,255,255,0.15)",
                  boxShadow:
                    activeThemeId === theme.id
                      ? `0 0 10px ${theme.accent}88`
                      : "none",
                  transition: "all 0.2s",
                }}
              />
              <span
                style={{
                  fontSize: "9px",
                  color: "#9AA0A6",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {theme.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Sync &amp; Account */}
      <div>
        <p style={sectionHeaderStyle}>Sync &amp; Account</p>

        {/* Cloud Sync row */}
        <div style={rowStyle}>
          <Cloud
            size={18}
            style={{ color: "#22C55E", marginRight: "12px", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <p
              className="text-white font-semibold"
              style={{ fontSize: "14px" }}
            >
              Cloud Sync
            </p>
            <p style={{ fontSize: "12px", color: "#9AA0A6", marginTop: "2px" }}>
              Auto-save to cloud
            </p>
          </div>
          {/* Pending sync badge */}
          {pendingSyncCount > 0 && !syncSuccess && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginRight: "10px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#f59e0b",
                  display: "inline-block",
                  boxShadow: "0 0 5px rgba(245,158,11,0.6)",
                }}
              />
              <span
                style={{ fontSize: "11px", color: "#f59e0b", fontWeight: 600 }}
              >
                {pendingSyncCount} pending
              </span>
            </div>
          )}
          {syncSuccess && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                marginRight: "10px",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#22C55E",
                  display: "inline-block",
                  boxShadow: "0 0 5px rgba(34,197,94,0.6)",
                }}
              />
              <span
                style={{ fontSize: "11px", color: "#22C55E", fontWeight: 600 }}
              >
                Synced!
              </span>
            </div>
          )}
          <Switch
            data-ocid="settings.cloud_sync.switch"
            checked={cloudSync}
            onCheckedChange={setCloudSync}
            aria-label="Toggle cloud sync"
          />
        </div>

        {/* Sync Now button — shown when there are pending changes */}
        {pendingSyncCount > 0 && !syncSuccess && (
          <button
            type="button"
            data-ocid="settings.sync_now.button"
            onClick={handleSyncNow}
            className="w-full cursor-pointer transition-all duration-200"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              background: "rgba(34,197,94,0.08)",
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "8px",
              border: "1px solid rgba(34,197,94,0.25)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(34,197,94,0.14)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background =
                "rgba(34,197,94,0.08)";
            }}
          >
            <RefreshCw size={16} style={{ color: "#22C55E", flexShrink: 0 }} />
            <div style={{ flex: 1, textAlign: "left" }}>
              <p
                className="font-semibold"
                style={{ fontSize: "13px", color: "#22C55E" }}
              >
                Sync Now
              </p>
              <p
                style={{ fontSize: "11px", color: "#9AA0A6", marginTop: "1px" }}
              >
                {pendingSyncCount} project{pendingSyncCount !== 1 ? "s" : ""}{" "}
                waiting to sync
              </p>
            </div>
          </button>
        )}

        {/* Save status row */}
        <div style={rowStyle}>
          <CheckCircle
            size={18}
            style={{ color: "#22C55E", marginRight: "12px", flexShrink: 0 }}
          />
          <div style={{ flex: 1 }}>
            <p
              className="text-white font-semibold"
              style={{ fontSize: "14px" }}
            >
              Save Status
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#22C55E",
                display: "inline-block",
                boxShadow: "0 0 6px rgba(34,197,94,0.6)",
              }}
            />
            <span style={{ fontSize: "12px", color: "#22C55E" }}>
              All changes saved
            </span>
          </div>
        </div>
      </div>

      {/* Account — Internet Identity */}
      <div>
        <p style={sectionHeaderStyle}>Account</p>

        {isInitializing ? (
          <div style={rowStyle}>
            <div
              data-ocid="settings.account.loading_state"
              style={{ fontSize: "13px", color: "#6B7280" }}
            >
              Initializing...
            </div>
          </div>
        ) : isLoggedIn ? (
          <>
            {/* Logged-in state */}
            <div style={rowStyle}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22C55E, #16a34a)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "12px",
                  flexShrink: 0,
                }}
              >
                <Fingerprint size={18} style={{ color: "#000" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p
                  className="text-white font-semibold"
                  style={{ fontSize: "14px" }}
                >
                  Internet Identity
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    color: "#9AA0A6",
                    marginTop: "2px",
                    fontFamily: "monospace",
                  }}
                >
                  {shortPrincipal}
                </p>
              </div>
            </div>

            <button
              type="button"
              data-ocid="settings.logout.button"
              className="w-full cursor-pointer transition-all duration-200"
              style={{ ...rowStyle, marginBottom: "8px" }}
              onClick={clear}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(239,68,68,0.35)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.06)";
              }}
            >
              <LogOut
                size={18}
                style={{ color: "#ef4444", marginRight: "12px", flexShrink: 0 }}
              />
              <span
                style={{ fontSize: "14px", color: "#ef4444", fontWeight: 500 }}
              >
                Log out
              </span>
            </button>
          </>
        ) : (
          <>
            <p
              style={{
                fontSize: "12px",
                color: "#6B7280",
                marginBottom: "12px",
                paddingLeft: "4px",
              }}
            >
              Sign in to sync your work across devices.
            </p>

            <button
              type="button"
              data-ocid="settings.ii_login.button"
              className="w-full cursor-pointer transition-all duration-200"
              style={{
                ...rowStyle,
                marginBottom: "8px",
                opacity: isLoggingIn ? 0.7 : 1,
              }}
              onClick={login}
              disabled={isLoggingIn}
              onMouseEnter={(e) => {
                if (!isLoggingIn)
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "rgba(34,197,94,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor =
                  "rgba(255,255,255,0.06)";
              }}
            >
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #22C55E, #166534)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: "12px",
                  flexShrink: 0,
                }}
              >
                <Fingerprint size={14} style={{ color: "#fff" }} />
              </div>
              <span
                className="text-white font-medium"
                style={{ fontSize: "14px" }}
              >
                {isLoggingIn
                  ? "Connecting..."
                  : "Sign in with Internet Identity"}
              </span>
            </button>
          </>
        )}
      </div>

      {/* About */}
      <div>
        <p style={sectionHeaderStyle}>About</p>
        <div style={rowStyle}>
          <p
            className="text-white font-medium"
            style={{ fontSize: "14px", flex: 1 }}
          >
            Version
          </p>
          <span style={{ fontSize: "13px", color: "#9AA0A6" }}>1.0.0</span>
        </div>
      </div>
    </div>
  );
}
