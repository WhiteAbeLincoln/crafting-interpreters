{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "node";
  buildInputs = [ pkgs.nodejs-16_x ];
  shellHook = ''
    export PATH="$PWD/node_modules/.bin/:$PATH"
  '';
}
