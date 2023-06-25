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

    let isPending = false;
    if (href) {
      try {
        const sheet = link.sheet;

        // If the CSS is loading, the sheet will be null.
        // I wonder if it still is null on other browsers. I only tested on Chrome.

        if (sheet != null) {
          // If the CSS is not loaded, the below code will throw an error.
          // It is the same as the above, only tested on Chrome.
          const cssRules = sheet.cssRules;
        } else {
          isPending = true;
        }

        link.setAttribute("is-loaded", "true");
      } catch (e) {
        // Remove the link, and then reload it.
        if (!isPending) {
          link.remove();
          reloadCSS(href);
        }
      }
    }
  });
};
