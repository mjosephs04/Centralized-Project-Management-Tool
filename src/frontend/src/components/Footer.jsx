export default function Footer() {
    return (
      <footer style={{ padding: 18, borderTop: "1px solid #334155", opacity: 0.85, color: "black"}}>
        <small>
          © {new Date().getFullYear()} Lone Star Grid Solutions · One Pager
        </small>
      </footer>
    );
  }