## 1. Purpose

* Represent screen transitions, API calls, and internal logic flows using a simple script format for quick understanding of the structure.

## 2. Components

* **FrontPage**: screen name (e.g., Home, LoginForm, Dashboard)
* **(backend api)**: backend API call

 * e.g.: (/signin), (/create\_order)
 * **Naming Rule**: API names can only contain lowercase letters, numbers, slashes `/`, and underscores `_`. No other special characters are allowed.
* **(process)**: internal logic or processing step

 * e.g.: (toast\_error), (validation)

## 3. Writing Rules

1. **Page → Page**

  * Screen transition based on user action
  * e.g.: `Home --> SignupForm`
2. **Page → API call**

  * Server request from the page
  * e.g.: `SignupForm --> (/signup)`
3. **API call → Page**

  * Screen transition or error handling based on API response
  * e.g.:

    ```
    (/signup) --> SignupForm : error
    (/signup) --> Classroom
    ```
4. **Page → Internal Process**

  * Execute logic within the page
  * e.g.: `CheckoutForm --> (validation)`
5. **Internal Process → Page or API call**

  * After logic completes, transition screen or trigger additional request
  * e.g.:

    ```
    (validation) --> (/create_order)
    (/create_order) --> OrderConfirmation : success
    ```

## 4. Branching

* Specify only states such as `: error`, `: success`, `: invalid`
* **Rule**: Do not use parentheses in descriptions after the colon

 * Incorrect: `: (error occurred)`
 * Correct: `: error occurred`

## 5. Examples

### Signup example

```navigation
Home --> SignupForm : User clicks the sign-up button
SignupForm --> (/signup)
(/signup) --> SignupForm : error
(/signup) --> Home
```

### Login example

```navigation
Home --> LoginForm : User clicks the login button
LoginForm --> (/signin)
(/signin) --> LoginForm : error
(/signin) --> Home
```