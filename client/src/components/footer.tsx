export function Footer() {
  const marqueeText = "© 2025 Club Alpha — Booking system by Ottawa SEO Inc. ";
  
  return (
    <footer className="border-t bg-card py-4 overflow-hidden" data-testid="footer">
      <div className="relative flex">
        <div className="animate-marquee whitespace-nowrap flex items-center text-sm text-muted-foreground">
          {Array(20).fill(marqueeText).map((text, i) => (
            <span key={i} className="mx-8">
              {text}
              <a
                href="https://ottawaseo.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1"
                data-testid="link-ottawa-seo"
              >
                Visit Ottawa SEO Inc.
              </a>
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
