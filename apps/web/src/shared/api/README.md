# Shared API

Application-wide API transport setup belongs here: base URL, credentials, and
construction of framework-neutral domain clients. Web is always
same-origin-proxied, so its base URL is a static empty string — a
runtime-resolved base URL is site's concern (`apps/site/app/composables/use-session.ts`),
not this module's. The raw generated transport remains internal; endpoint
state stays with its feature.
