export function registerProvider(program) {
  program
    .command("provider [subcommand]")
    .description("Manage provider connections (use 'providers' for the full interface)")
    .allowUnknownOption()
    .allowExcessArguments()
    .action(() => {
      console.log(`
  Use \`nextroute providers\` for the full provider management interface:

    nextroute providers available   — show provider catalog
    nextroute providers list        — list configured connections
    nextroute providers test <name> — test a provider connection
    nextroute providers test-all    — test all active connections
    nextroute providers validate    — validate local configuration
`);
    });
}
