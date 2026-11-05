() => {
  const pick = (sel) => Array.from(document.querySelectorAll(sel)).map(el => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      cls: el.className,
      rect: [r.x, r.y, r.width, r.height],
      position: cs.position, padding: cs.padding, margin: cs.margin, gap: cs.gap,
      display: cs.display, flexDirection: cs.flexDirection, borderRadius: cs.borderRadius,
      border: cs.border, bg: cs.backgroundColor, boxShadow: cs.boxShadow,
    };
  });
  return {
    surface: pick('.workspace-floating-navigation-surface'),
    content: pick('.workspace-floating-navigation .workspace-navigation-content'),
    list: pick('.workspace-floating-navigation .generation-skills-navigation-list'),
    agentList: pick('.workspace-floating-navigation .agent-conversation-list'),
    section: pick('.workspace-floating-navigation .workspace-navigation-section'),
    sectionLabel: pick('.workspace-floating-navigation .workspace-navigation-section-label'),
    sectionContent: pick('.workspace-floating-navigation .workspace-navigation-section-content'),
    scrollArea: pick('.workspace-floating-navigation .workspace-navigation-scroll-area'),
    scrollview: pick('.workspace-floating-navigation .workspace-navigation-scrollview'),
    sbTrack: pick('.workspace-navigation-scrollbar-track'),
    sb: pick('.workspace-navigation-scrollbar'),
  };
}
