---
id: "addHeader"
title: "Function: addHeader"
sidebar_label: "addHeader"
sidebar_position: 0
custom_edit_url: null
---

▸ **addHeader**(`header`, `body`): `string`

Adds a header to a body of text.

This function takes a header string and a body string and returns a new string with the header prepended to the body.
If the body string is empty, the header is returned as is.

#### Parameters

| Name     | Type     | Description                          |
| :------- | :------- | :----------------------------------- |
| `header` | `string` | The header to add to the body.       |
| `body`   | `string` | The body to which to add the header. |

#### Returns

`string`

The body with the header prepended.

**`Example`**

```ts
// Given a header and a body
const header = "Header";
const body = "Body";

// Adding the header to the body will result in:
// "Header\nBody"
const text = addHeader(header, body);
```
