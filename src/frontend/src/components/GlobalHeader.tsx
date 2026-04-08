import { Menu, Settings } from "lucide-react";

interface GlobalHeaderProps {
  onMenuClick: () => void;
  onSettingsClick: () => void;
}

export function GlobalHeader({
  onMenuClick,
  onSettingsClick,
}: GlobalHeaderProps) {
  return (
    <header
      data-ocid="global_header.panel"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        height: "72px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Green radial glow behind W */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "200px",
          height: "200px",
          background:
            "radial-gradient(circle at 50% 0%, rgba(0,255,120,0.13), transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* Hamburger — 16px from left, vertically centered */}
      <button
        type="button"
        data-ocid="hamburger.button"
        onClick={onMenuClick}
        aria-label="Open menu"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "16px",
          background: "transparent",
          border: "none",
          color: "#9AA0A6",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "8px",
          flexShrink: 0,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#9AA0A6";
        }}
      >
        <Menu size={22} />
      </button>

      {/* Center: W icon + Writefy text, W exactly 12px from top */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          top: "12px",
        }}
      >
        {/* Square Green W icon */}
        <div
          style={{
            width: "32px",
            height: "32px",
            background: "#22C55E",
            color: "#000000",
            borderRadius: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: "20px",
            lineHeight: 1,
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}
        >
          W
        </div>
        {/* Writefy text — 8px gap below icon */}
        <span
          style={{
            marginTop: "8px",
            color: "#ffffff",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.06em",
            lineHeight: 1,
          }}
        >
          Writefy
        </span>
      </div>

      {/* Settings gear — 16px from right, vertically centered */}
      <button
        type="button"
        data-ocid="settings.button"
        onClick={onSettingsClick}
        aria-label="Open settings"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "16px",
          background: "transparent",
          border: "none",
          color: "#9AA0A6",
          cursor: "pointer",
          padding: "8px",
          borderRadius: "8px",
          flexShrink: 0,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#9AA0A6";
        }}
      >
        <Settings size={20} />
      </button>
    </header>
  );
}
