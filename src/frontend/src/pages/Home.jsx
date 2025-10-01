import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar"
import FeatureCard from "../components/FeatureCard";
import Footer from "../components/Footer";

export default function Home() {
  const nav = useNavigate();

  return (
    <div style={styles.page}>
      {/* subtle orb background */}
      <div style={styles.orb} aria-hidden />

      {/* NavBar with CTAs matching the mock */}
      <Navbar
        primaryCta={{ label: "Login", to: "/login" }}
        secondaryCta={{ label: "Create Account", to: "/register" }}
      />

      {/* Hero */}
      <div style={styles.heroWrap}>
        <h1 style={styles.h1}>Lone Star Grid Solutions Dashboard</h1>
        <p style={styles.lead}>
          A centralized, web-based tool to manage LSGS projects, work orders, crews, contractors,
          supply requests, schedules, and access—built for real-time visibility and operational efficiency.
        </p>

        <div style={styles.ctaRow}>
          <button type="button" onClick={() => nav("/login")} style={styles.ctaBtn}>
            Sign in
          </button>
          <button type="button" onClick={() => nav("/create-account")} style={styles.ctaBtn}>
            Create an Account
          </button>
          <button
            type="button"
            onClick={() => window.alert("Demo page placeholder")}
            style={styles.ghostBtn}
          >
            View Demo
          </button>
        </div>
      </div>

      {/* PMT Capabilities */}
      <section style={styles.section}>
        <h2 style={styles.h2}>PMT Capabilities</h2>
        <div style={styles.grid3}>
          <FeatureCard to="/projects" title="Project Managers" icon={<Emoji>🧭</Emoji>}>
            Oversee projects, teams, and contractors by setting timelines, monitoring status, and ensuring milestones are met.
          </FeatureCard>

          <FeatureCard to="/crews" title="Crews & Contractors" icon={<Emoji>👷</Emoji>}>
            Assign work to internal crews or external contractors, track availability, and monitor task progress in real time.
          </FeatureCard>

          <FeatureCard to="/projects" title="Projects" icon={<Emoji>📁</Emoji>}>
            Central hub for managing project details, including timelines, work orders, supplies, and team assignments.
          </FeatureCard>

          <FeatureCard to="/work-orders" title="Work Orders" icon={<Emoji>📝</Emoji>}>
            Define and track specific tasks within a project, including start/end dates, status, and assigned teams.
          </FeatureCard>

          <FeatureCard to="/supplies" title="Request Supplies" icon={<Emoji>📦</Emoji>}>
            Request and track materials from vendors to support active projects and avoid delays.
          </FeatureCard>

          <FeatureCard to="/schedules" title="Schedules & Milestones" icon={<Emoji>📆</Emoji>}>
            Plan project timelines, set milestones, and monitor progress to keep projects on track.
          </FeatureCard>

          <FeatureCard to="/access" title="Access Management" icon={<Emoji>🔐</Emoji>}>
            Provide secure, role-based access so only authorized users can view or manage project data.
          </FeatureCard>
        </div>
      </section>

      {/* Next Up */}
      <section style={{ ...styles.section, paddingBottom: 48 }}>
        <h2 style={styles.h2}>Next Up</h2>
        <div style={styles.grid3}>
          <FeatureCard to="/dashboard" title="Interactive Dashboard" icon={<Emoji>📊</Emoji>}>
            Track project status, milestones, and resources in real time with a centralized, visual dashboard.
          </FeatureCard>
          <FeatureCard to="/docs" title="Docs & User Guide" icon={<Emoji>📚</Emoji>}>
            Access clear technical documentation and a concise user manual to support system adoption and training.
          </FeatureCard>
          <FeatureCard to="/ai" title="AI Integrations" icon={<Emoji>🤖</Emoji>}>
            Leverage AI to analyze project data, forecast resource needs, and enhance decision-making across LSGS systems.
          </FeatureCard>
        </div>
      </section>

      <Footer />
    </div>
  );
}

/* tiny helper for icons so they size nicely inside FeatureCard */
function Emoji({ children }) {
  return <span style={{ fontSize: 16, lineHeight: "1" }}>{children}</span>;
}

/* ----------------- styles ----------------- */
const COLORS = {
  blue: "#143088",
  blueDark: "#0b1f64",
  text: "#e6edf7",
  pillGrad: "linear-gradient(180deg, #c6587a 0%, #b64c6c 70%, #a64562 100%)",
};

const styles = {
  page: {
    minHeight: "100vh",
    background: COLORS.blue,
    color: COLORS.text,
    fontFamily:
      "Inter, system-ui, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
    position: "relative",
    overflow: "hidden",
  },

  orb: {
    position: "absolute",
    left: "50%",
    top: "42%",
    transform: "translate(-50%, -50%)",
    width: "95vmin",
    height: "95vmin",
    borderRadius: "50%",
    background:
      "radial-gradient(60% 60% at 50% 55%, rgba(221,88,80,0.9) 0%, rgba(174,71,111,0.7) 45%, rgba(20,48,136,0) 70%)",
    filter: "saturate(115%)",
    opacity: 0.25,
    pointerEvents: "none",
  },

  heroWrap: { padding: "64px 24px 24px", textAlign: "center", position: "relative", zIndex: 1 },
  h1: { fontSize: 48, margin: 0, letterSpacing: 0.5, fontWeight: 800 },
  lead: {
    marginTop: 12,
    opacity: 0.92,
    maxWidth: 860,
    marginInline: "auto",
    lineHeight: 1.6,
    fontSize: 18,
  },

  ctaRow: {
    marginTop: 28,
    display: "flex",
    gap: 12,
    justifyContent: "center",
    flexWrap: "wrap",
  },
  ctaBtn: {
    background: COLORS.pillGrad,
    color: COLORS.text,
    padding: "12px 18px",
    borderRadius: 999,
    border: "none",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
  ghostBtn: {
    background: "transparent",
    color: COLORS.text,
    border: "1px solid rgba(255,255,255,0.55)",
    padding: "12px 18px",
    borderRadius: 999,
    fontWeight: 800,
    cursor: "pointer",
  },

  section: { padding: "24px", maxWidth: 1100, margin: "24px auto" },
  h2: { fontSize: 28, marginBottom: 12, fontWeight: 800 },
  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
  },
};