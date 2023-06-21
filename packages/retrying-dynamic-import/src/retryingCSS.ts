const reloadCSS = (href: string) => {
  const link = document.createElement("link");

  link.setAttribute("rel", "stylesheet");
  link.setAttribute("href", href);

  document.head.appendChild(link);

  link.addEventListener("load", () => {
    link.setAttribute("is-loaded", "true");
  });
};

export const retryToLoadCSS = () => {
  const links = document.querySelectorAll(
    `link[rel="stylesheet"]:not([is-loaded])`
  );

  links.forEach((link: HTMLLinkElement) => {
    const href = link.href;

    if (href) {
      // If the CSS is not loaded, the below code will throw an error.
      try {
        const sheet = link.sheet;
        const cssRules = sheet.cssRules;

        link.setAttribute("is-loaded", "true");
      } catch (e) {
        // Remove the link, and then reload it.
        link.remove();
        reloadCSS(href);
      }
    }
  });
};
