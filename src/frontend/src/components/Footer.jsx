export default function Footer() {
    return (
      <footer style={{ padding: 18, borderTop: "1px solid #334155", opacity: 0.85 }}>
        <small>
          © {new Date().getFullYear()} Pariveda · Lone Star Grid Solutions
        </small>
      </footer>
    );
  }