# Minimalistic diary

The goal of this project is to make basic React app, that is not to-do list. I know, this is has-done list, but shh. I want to expand on the idea with some extra features:

-   [**persistence**](#persistence) - user data will be saved in browser storage
-   [**security**](#security) - user data will be secured using password
-   [**pwa enabled**](#pwa-enabled) - small addition, but useful for mobile phones
-   [**minimize js**](#minimize-js) - use as much stock html and css features to minimize JS

## Persistence

Data will be stored in browser storage. There are several ways to be considered.

### Local storage warrior

All data can be saved in this string-string map. It sure is easier to implement, but it really isn't pretty. User data can be stored as big stringified object or as separate records under common key prefix.

### Indexed database mage

Perfect for storing user data. Easier to implement tables for storing multiple user auth data. But that is too much work.

### Jack-of-all-trades bard

Thanks to aiming for one user only, we can store auth data in the local storage and user data in the database. To ensure not loosing everything when someone accidentally removes local storage (_cough_), we can tell user to store database key elsewhere and ask for it, when we loose it.

## Security

This application is not aiming at multiple users. There will be only one user for one browser.

### Password and Data

User will have to enter password when they open session. The password itself won't be stored. It will be encoded using [PBKDF2](https://en.wikipedia.org/wiki/PBKDF2) and the output will be used as key to encrypting randomly generated database key using [AES-GCM](https://www.cryptopp.com/wiki/GCM_Mode).

Each diary note will be hashed with the database key. Using database key generated when the page is first opened will ensure, that user will be able to change password. For new password all we have to do is decode the old password with the old password key and encode with the new one.

### Diagram of crypto data flow

```
    ┌──────────────────┐
    │ User's password  │
    └─────────┬────────┘
              ▼ PBKDF2
    ┌──────────────────┐     ┌───────────────────┐
┌───┤Encrypted password│◄────┤   Salt (STORED)   │
│   └─────────┬────────┘     └───────────────────┘
│             ▼ AES-GCM
│   ┌──────────────────┐     ┌───────────────────┐
│   │ Encrypted DB key │◄────┤   Random DB key   │
│   │      (STORED)    │     │(generated at regi)│
│   └──────────────────┘     └──────────┬────────┘
│                                       │
│   ┌──────────────────┐                │
└──►│     HMAC         │◄───────────────┤
    │(crypto check-sum)│                │
    └──────────────────┘                │
                                        │
                                        │ AES-GCM
                                        ▼
    ┌──────────────────┐     ┌───────────────────┐
    │    Users data    ├────►│  User gibberish   │
    │                  │     │       (STORED)    │
    └──────────────────┘     └───────────────────┘
```

### Login

1. user enters a password
1. password-key is generated from stored salt
1. database-key is decrypted using password-key
1. database-key is verified using stored HMAC
1. login was successful and we can start using database

### Thoughts

In the end we will stored three items for authentication purposes.

-   salt - zero information
-   HMAC - not really possible to get any information due to double layer hashing
-   encrypted DB key - same as HMAC

## PWA enabled

For users to install this web app onto their phone or desktop for offline use.

This is done thanks to Vite PWA package.

## Minimize JS

Try to use modern browser features such as:

-   [popover](https://www.w3schools.com/tags/att_popover.asp)
-   [light-dark](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)
-   [relative color syntax](https://codepen.io/fbernack/pen/jEbegJg)
-   [content-visibility](https://content-visibility-demo-igp4j.sevalla.page/)
-   [css property](https://css-tricks.com/almanac/rules/p/property/)

## Sources

-   [PBKDF2 implementation](https://mojoauth.com/hashing/pbkdf2-in-javascript-in-browser/)
-   [Double key shenanigans](https://stackoverflow.com/questions/27608474/do-modern-browsers-encrypt-or-otherwise-protect-indexeddb-storage#comment131712139_27608507)
-   [AES-GCM](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)
-   [ASCII graph](https://asciiflow.com/#/)
-   [PWA Vite install](https://www.saurabhmisra.dev/setup-react-pwa-using-vite/)
-   [modern features video](https://www.youtube.com/watch?v=55uUK-iJeNM)
-   [pick ui colors video](https://www.youtube.com/watch?v=vvPklRN0Tco)
-   [pick ui colors logic](https://codepen.io/whosajid/pen/QwbZOzG)

## TODO

-   note component
-   notes layout
-   settings/bottom/logout styling
-   authentication
-   saving notes to indexedDB
-   import/export - plain json, hashed
-   logout timeout
