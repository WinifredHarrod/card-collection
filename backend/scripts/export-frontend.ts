import fs from "fs";
import path from "path";

const root = path.resolve(__dirname, "..");
const deploymentsDir = path.join(root, "deployments");
const artifactSrc = path.join(root, "artifacts", "contracts", "CardCollection.sol", "CardCollection.json");
const frontendOut = path.resolve(root, "..", "frontend", "src", "abi");

fs.mkdirSync(frontendOut, { recursive: true });

// Export ABI from artifacts
if (!fs.existsSync(artifactSrc)) {
  throw new Error(`ABI not found at ${artifactSrc}. Run 'npm run build' or deploy first.`);
}
const abiJson = JSON.parse(fs.readFileSync(artifactSrc, "utf8"));
fs.writeFileSync(
  path.join(frontendOut, "CardCollectionABI.ts"),
  `export const CardCollectionABI = ${JSON.stringify({ abi: abiJson.abi }, null, 2)} as const;\n`
);

// Export addresses by chainId
const addrOut = path.join(frontendOut, "CardCollectionAddresses.ts");
const entries: Record<string, { address: string; chainName?: string; chainId: number }> = {};

if (fs.existsSync(deploymentsDir)) {
  for (const chainName of fs.readdirSync(deploymentsDir)) {
    const dir = path.join(deploymentsDir, chainName);
    const f = path.join(dir, "CardCollection.json");
    if (!fs.existsSync(f)) continue;
    const d = JSON.parse(fs.readFileSync(f, "utf8"));
    if (d.address && d.address.startsWith("0x")) {
      entries[String(d.chainId ?? 0)] = {
        address: d.address,
        chainName,
        chainId: d.chainId ?? 0,
      };
    }
  }
}

fs.writeFileSync(
  addrOut,
  `export const CardCollectionAddresses = ${JSON.stringify(entries, null, 2)} as const;\n`
);

console.log("Frontend ABI/Addresses exported to", frontendOut);


