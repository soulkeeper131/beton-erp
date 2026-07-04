declare module "node-imap" {
  const Imap: any;
  export = Imap;
}

declare module "mailparser" {
  export function simpleParser(source: any): Promise<any>;
}
