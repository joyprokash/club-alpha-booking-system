export function Footer() {
  return (
    <footer className="border-t bg-card py-4 px-6 text-center text-sm text-muted-foreground" data-testid="footer">
      <p>
        © 2025 Club Alpha — Booking system by{" "}
        <a
          href="https://ottawaseo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
          data-testid="link-ottawa-seo"
        >
          Ottawa SEO Inc.
        </a>
      </p>
    </footer>
  );
}
