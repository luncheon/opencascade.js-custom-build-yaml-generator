const fs = require("fs");
const path = require("path");
const ts = require("typescript");
const { generateDtsBundle } = require("dts-bundle-generator");
const { name: thisPackageName } = require("./package.json");

const yamlTemplate = (name, bindingTypeNames) => `mainBuild:
  name: ${name}
  emccFlags:
    - -O3
    - -sEXPORT_ES6=1
    - -sUSE_ES6_IMPORT_META=0
    - -sEXPORTED_RUNTIME_METHODS=['FS']
    - -sINITIAL_MEMORY=100MB
    - -sMAXIMUM_MEMORY=4GB
    - -sALLOW_MEMORY_GROWTH=1
    - -sUSE_FREETYPE=1
  bindings:
${bindingTypeNames.map((className) => `    - symbol: ${className}`).join("\n")}
`;

const makeupMissingTypes = (sourceFilePath) => {
  const program = ts.createProgram({ rootNames: [sourceFilePath], options: {} });
  const names = new Set();
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const messageText = typeof diagnostic.messageText === "string" ? diagnostic.messageText : diagnostic.messageText.messageText;
    const match = messageText.match(/Cannot find name '(.+)'\./);
    match && names.add(match[1]);
  }
  const typeDefinitions = [...names, "init"].map((name) => `  type ${name} = { readonly _: unique symbol };`).join("\n");
  return `${fs.readFileSync(sourceFilePath, "utf8")}\ndeclare global {\n${typeDefinitions}\n}\n`;
};

const collectClassNames = (sourceFilePath) => {
  const classNames = [];
  const sourceFile = ts.createProgram({ rootNames: [sourceFilePath], options: {} }).getSourceFile(sourceFilePath);
  const visit = (node) => {
    if (ts.isClassDeclaration(node)) {
      classNames.push(node.name.text);
    } else if (ts.isTypeAliasDeclaration(node)) {
      ["boolean", "number", "string"].includes(node.type.getText(sourceFile)) || classNames.push(node.name.text);
    } else {
      ts.forEachChild(node, visit);
    }
  };
  sourceFile.forEachChild(visit);
  return classNames.sort();
};

module.exports = ({ classes, name = "custom-opencascade.js", outfile = name.replace(/\.js$/, "") + ".yaml", debug = false }) => {
  fs.mkdtemp(`.${thisPackageName}`, (err, tempPath) => {
    if (err) {
      throw err;
    }
    try {
      const sourceFilePath = path.resolve(tempPath, "source.ts");
      const intermediate1 = path.resolve(tempPath, "intermediate1.d.ts");
      const intermediate2 = path.resolve(tempPath, "intermediate2.d.ts");
      fs.writeFileSync(sourceFilePath, `export { ${classes.join()} } from "opencascade.js"`);
      fs.writeFileSync(path.resolve(tempPath, "tsconfig.json"), `{"compilerOptions":{"skipLibCheck":true}}`, "utf8");
      fs.writeFileSync(intermediate1, makeupMissingTypes(sourceFilePath), "utf8");
      fs.writeFileSync(
        intermediate2,
        generateDtsBundle([{ filePath: intermediate1, libraries: { inlinedLibraries: "opencascade.js" } }])[0],
      );
      fs.mkdirSync(path.dirname(outfile), { recursive: true });
      fs.writeFileSync(outfile, yamlTemplate(name, collectClassNames(intermediate2)), "utf8");
    } finally {
      debug || fs.rmSync(tempPath, { recursive: true });
    }
  });
};
