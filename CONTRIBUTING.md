# Contributing

If you would like to contribute code to `posthog-react-native` you can do so through
GitHub by forking the repository and sending a pull request.

When submitting code, please make every effort to follow existing conventions
and style in order to keep the code as readable as possible. Please also make
sure your code runs by [building](#building) and [testing](#testing).

## Style Guide

We use [prettier](https://www.github.com/prettier/prettier) to format our code.

## Environment

This project is a Yarn workspace, npm is not supported. To install dependencies run :

```bash
$ yarn
```

### Building

```bash
$ yarn build
```

## Testing

```bash
$ yarn test
```

### Architecture

- `core`: the `posthog-react-native` module
  - `src`: JavaScript module
  - `ios`: iOS native module
  - `android`: Android native module
