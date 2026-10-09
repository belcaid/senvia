import eslint from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

const vueTypeScriptRules = {
  ...tseslint.configs.recommended[1].rules,
  ...tseslint.configs.recommended[2].rules,
}

export default tseslint.config(
  {
    ignores: [
      'android/**',
      'coverage/**',
      'dist/**',
      'ios/**',
      'node_modules/**',
      'public/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: vueTypeScriptRules,
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'no-debugger': 'off',
      'vue/no-deprecated-slot-attribute': 'off',
    },
  },
)
