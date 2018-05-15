declare namespace process {
  function chdir(directory: string): void
}

declare var __dirname: string

process.chdir(__dirname)
