{
  description = "SvelteKit Development Environment";
  # Flake inputs
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };
  # Flake outputs
  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      with pkgs;
      {
        # Development environment output
        devShells.default = mkShell {
          nativeBuildInputs = [ 
            # Node.js runtime
            nodejs_24
            pnpm
            
            # Development tools
            git
            just
            opencode
          ];
          buildInputs = [ 
            # Additional build dependencies if needed
          ];
          shellHook = ''
            echo "⚡ SvelteKit development environment loaded!"
            echo "  Node.js version: $(node --version)"
            echo "  pnpm version: $(pnpm --version)"
            
            # Set up local pnpm store
            export PNPM_HOME="$PWD/.pnpm-store"
            mkdir -p "$PNPM_HOME"
          '';
        };
        # Packages exposed for `nix build`
        packages = {
          default = nodejs_24;
          nodejs = nodejs_24;
          pnpm = pnpm;
        };
      }
    );
}
