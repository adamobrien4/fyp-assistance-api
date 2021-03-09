module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true
  },
  extends: ['standard'],
  parserOptions: {
    ecmaVersion: 12
  },
  plugins: ['only-warn'],
  rules: {
    'prefer-const': 0,
    'comma-dangle': ['error', 'never'],
    'no-unused-vars': ['warn'],
    'no-var': ['off'],
    'one-var': ['off'],
    'space-before-function-paren': ['off']
  }
}
