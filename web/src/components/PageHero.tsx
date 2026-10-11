/** En-tête des pages intérieures : éditorial, sur papier. `title` accepte du JSX pour un mot en <em>. */
export function PageHero({ eyebrow, title, lead, children }: {
  eyebrow?: string; title: React.ReactNode; lead?: React.ReactNode; children?: React.ReactNode;
}) {
  return (
    <section className="page-hero">
      <div className="container page-hero__inner">
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {lead && <p className="lead">{lead}</p>}
        </div>
        {children && <div>{children}</div>}
      </div>
    </section>
  );
}
