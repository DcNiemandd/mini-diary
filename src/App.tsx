function App() {
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <h1>Minimalistic diary</h1>
            <p>
                The goal of this project is to make basic React app, that is not to-do list. I know, this is has-done
                list, but shh. I want to expand on the idea with some extra features:
            </p>
            <ul>
                <li>
                    <a href="#persistence">
                        <strong>persistence</strong>
                    </a>{' '}
                    - user data will be saved in browser storage
                </li>
                <li>
                    <a href="#security">
                        <strong>security</strong>
                    </a>{' '}
                    - user data will be secured using password
                </li>
                <li>
                    <a href="#pwa-enabled">
                        <strong>pwa enabled</strong>
                    </a>{' '}
                    - small addition, but useful for mobile phones
                </li>
                <li>
                    <a href="#minimize-js">
                        <strong>minimize js</strong>
                    </a>{' '}
                    - use as much stock html and css features to minimize JS
                </li>
            </ul>
            <h2>Persistence</h2>
            <p>Data will be stored in browser storage. There are several ways to be considered.</p>
            <h3>Local storage warrior</h3>
            <p>
                All data can be saved in this string-string map. It sure is easier to implement, but it really isn&#39;t
                pretty. User data can be stored as big stringified object or as separate records under common key
                prefix.
            </p>
            <h3>Indexed database mage</h3>
            <p>
                Perfect for storing user data. Easier to implement tables for storing multiple user auth data. But that
                is too much work.
            </p>
            <h3>Jack-of-all-trades bard</h3>
            <p>
                Thanks to aiming for one user only, we can store auth data in the local storage and user data in the
                database. To ensure not loosing everything when someone accidentally removes local storage (
                <em>cough</em>), we can tell user to store database key elsewhere and ask for it, when we loose it.
            </p>
            <h2>Security</h2>
            <p>This application is not aiming at multiple users. There will be only one user for one browser.</p>
            <h3>Password and Data</h3>
            <p>
                User will have to enter password when they open session. The password itself won&#39;t be stored. It
                will be encoded using <a href="https://en.wikipedia.org/wiki/PBKDF2">PBKDF2</a> and the output will be
                used as key to encrypting randomly generated database key using{' '}
                <a href="https://www.cryptopp.com/wiki/GCM_Mode">AES-GCM</a>.
            </p>
            <p>
                Each diary note will be hashed with the database key. Using database key generated when the page is
                first opened will ensure, that user will be able to change password. For new password all we have to do
                is decode the old password with the old password key and encode with the new one.
            </p>
            <h3>Diagram of crypto data flow</h3>
            <pre>
                <code
                    dangerouslySetInnerHTML={{
                        __html: `
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
    `,
                    }}
                />
            </pre>
            <h3>Login</h3>
            <ol>
                <li>user enters a password</li>
                <li>password-key is generated from stored salt</li>
                <li>database-key is decrypted using password-key</li>
                <li>database-key is verified using stored HMAC</li>
                <li>login was successful and we can start using database</li>
            </ol>
            <h3>Thoughts</h3>
            <p>In the end we will stored three items for authentication purposes.</p>
            <ul>
                <li>salt - zero information</li>
                <li>HMAC - not really possible to get any information due to double layer hashing</li>
                <li>encrypted DB key - same as HMAC</li>
            </ul>
            <h2>PWA enabled</h2>
            <p>For users to install this web app onto their phone or desktop for offline use.</p>
            <p>This is done thanks to Vite PWA package.</p>
            <h2>Minimize JS</h2>
            <p>Try to use modern browser features such as:</p>
            <ul>
                <li>
                    <a href="https://www.w3schools.com/tags/att_popover.asp">popover</a>
                </li>
                <li>
                    <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark">light-dark</a>
                </li>
                <li>
                    <a href="https://codepen.io/fbernack/pen/jEbegJg">relative color syntax</a>
                </li>
                <li>
                    <a href="https://content-visibility-demo-igp4j.sevalla.page/">content-visibility</a>
                </li>
                <li>
                    <a href="https://css-tricks.com/almanac/rules/p/property/">css property</a>
                </li>
            </ul>
            <h2>Sources</h2>
            <ul>
                <li>
                    <a href="https://mojoauth.com/hashing/pbkdf2-in-javascript-in-browser/">PBKDF2 implementation</a>
                </li>
                <li>
                    <a href="https://stackoverflow.com/questions/27608474/do-modern-browsers-encrypt-or-otherwise-protect-indexeddb-storage#comment131712139_27608507">
                        Double key shenanigans
                    </a>
                </li>
                <li>
                    <a href="https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey">AES-GCM</a>
                </li>
                <li>
                    <a href="https://asciiflow.com/#/">ASCII graph</a>
                </li>
                <li>
                    <a href="https://www.saurabhmisra.dev/setup-react-pwa-using-vite/">PWA Vite install</a>
                </li>
                <li>
                    <a href="https://www.youtube.com/watch?v=55uUK-iJeNM">modern features video</a>
                </li>
            </ul>
        </div>
    );
}

export default App;

