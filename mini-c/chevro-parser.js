import { CstParser, Lexer, createToken } from 'chevrotain';

// === TOKEN-DEFINITIONEN ===
// Whitespace (wird übersprungen)
const WhiteSpace = createToken({
  name: "WhiteSpace",
  pattern: /[ \t]+/,
  group: Lexer.SKIPPED
});

// Zeilenendezeichen
const EOL = createToken({
  name: "EOL",
  pattern: /\r?\n/,
  group: Lexer.SKIPPED
});

// Zahlen (GEÄNDERT: Keine negativen Zahlen im Pattern)
const Number = createToken({
  name: "Number",
  pattern: /\d+(\.\d+)?/  // Entfernt: /^-?/ für negative Zahlen
});

// Identifier (muss nach Keywords definiert werden)
const Identifier = createToken({
  name: "Identifier",
  pattern: /[A-Za-z_$#][A-Za-z0-9_$#]*/
});

// Keywords (müssen vor Identifier definiert werden wegen longer_alt)
const Int = createToken({ name: "Int", pattern: /int/, longer_alt: Identifier });
const Void = createToken({ name: "Void", pattern: /void/, longer_alt: Identifier });
const Return = createToken({ name: "Return", pattern: /return/, longer_alt: Identifier });
const Float = createToken({ name: "Float", pattern: /float/, longer_alt: Identifier });
const String = createToken({ name: "String", pattern: /string/, longer_alt: Identifier });
const Auto = createToken({ name: "Auto", pattern: /auto/, longer_alt: Identifier });
const Null = createToken({ name: "Null", pattern: /null/, longer_alt: Identifier });

// NEUES TOKEN für typedef
const Typedef = createToken({ name: "Typedef", pattern: /typedef/, longer_alt: Identifier });

// Modifiers
const Const = createToken({ name: "Const", pattern: /const/, longer_alt: Identifier });

// Control Flow Keywords
const If = createToken({ name: "If", pattern: /if/, longer_alt: Identifier });
const Else = createToken({ name: "Else", pattern: /else/, longer_alt: Identifier });
const For = createToken({ name: "For", pattern: /for/, longer_alt: Identifier });

// Arithmetik-Operatoren
const Plus = createToken({ name: "Plus", pattern: /\+/ });
const Minus = createToken({ name: "Minus", pattern: /-/ });
const Multiply = createToken({ name: "Multiply", pattern: /\*/ });
const Divide = createToken({ name: "Divide", pattern: /\// });

// Assignment-Operatoren
const PlusEquals = createToken({ name: "PlusEquals", pattern: /\+=/ });
const MinusEquals = createToken({ name: "MinusEquals", pattern: /-=/ });

// Vergleichsoperatoren
const GreaterThan = createToken({ name: "GreaterThan", pattern: />/ });
const LessThan = createToken({ name: "LessThan", pattern: /</ });
const GreaterEqual = createToken({ name: "GreaterEqual", pattern: />=/ });
const LessEqual = createToken({ name: "LessEqual", pattern: /<=/ });
const EqualEqual = createToken({ name: "EqualEqual", pattern: /==/ });
const NotEqual = createToken({ name: "NotEqual", pattern: /!=/ });

// NEUE Logische Operatoren
const LogicalAnd = createToken({ name: "LogicalAnd", pattern: /&&/ });
const LogicalOr = createToken({ name: "LogicalOr", pattern: /\|\|/ });

// Unary-Operatoren
const Increment = createToken({ name: "Increment", pattern: /\+\+/ });
const Decrement = createToken({ name: "Decrement", pattern: /--/ });

// Member-Zugriff
const Dot = createToken({ name: "Dot", pattern: /\./ });

// Delimiter und Operatoren
const LParen = createToken({ name: "LParen", pattern: /\(/ });
const RParen = createToken({ name: "RParen", pattern: /\)/ });
const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
const Comma = createToken({ name: "Comma", pattern: /,/ });
const Equals = createToken({ name: "Equals", pattern: /=/ });

// NEUES TOKEN für Arrow-Funktionen
const Arrow = createToken({ name: "Arrow", pattern: /=>/ });

// String Literals
const StringLiteral = createToken({
  name: "StringLiteral",
  pattern: /"([^"\\]|\\.)*"/
});

// Alle Tokens in der richtigen Reihenfolge
const allTokens = [
  WhiteSpace,
  EOL,
  // Keywords zuerst
  Typedef, // Typedef Token hinzugefügt
  Null,
  Int, Void, Return, Float, String, Auto,
  Const,
  If, Else, For,
  LogicalAnd, LogicalOr,
  // Vergleichsoperatoren (WICHTIG: >= und <= vor > und <)
  GreaterEqual, LessEqual, EqualEqual, NotEqual,
  GreaterThan, LessThan,
  // Assignment-Operatoren (WICHTIG: += und -= vor + und -)
  PlusEquals, MinusEquals,
  // Unary-Operatoren (WICHTIG: vor arithmetischen Operatoren wegen ++ und --)
  Increment, Decrement,
  // Arithmetik-Operatoren (WICHTIG: Plus vor Minus wegen ++)
  Plus, Minus, Multiply, Divide,
  // Member-Zugriff
  Dot,
  // Arrow-Token
  Arrow, // Arrow-Token hinzugefügt
  // Dann andere Tokens
  Number, StringLiteral, Identifier,
  // Delimiter
  LParen, RParen, LBrace, RBrace, LBracket, RBracket,
  Semicolon, Comma, Equals
];

// === LEXER ===
const CLanguageLexer = new Lexer(allTokens);

// === PARSER ===
class CLanguageParser extends CstParser {
  constructor() {
    super(allTokens, {
      maxLookahead: 5
    });

    const isPrimitiveType = (tokenType) =>
      tokenType === Int || tokenType === Float || tokenType === String || tokenType === Auto;
    // const isCustomType = (tokenType) => tokenType === Identifier; // Nicht mehr direkt benötigt für GATEs
    const isVoidType = (tokenType) => tokenType === Void;

    this.typeSpecifier = this.RULE("typeSpecifier", () => {
      this.OR([
        { ALT: () => this.CONSUME(Int) },
        { ALT: () => this.CONSUME(Float) },
        { ALT: () => this.CONSUME(String) },
        { ALT: () => this.CONSUME(Void) },
        { ALT: () => this.CONSUME(Auto) },
        { ALT: () => this.CONSUME(Identifier) } // Für benutzerdefinierte Typen
      ]);
      // Optionale Array-Klammern direkt nach dem Typ
      this.OPTION(() => {
        this.CONSUME(LBracket);
        this.CONSUME(RBracket);
      });
    });

    // NEUE REGEL für Lambda-Ausdrücke (C++-Stil)
    this.lambdaExpression = this.RULE("lambdaExpression", () => {
      this.CONSUME(LBracket); // Capture-Klausel Anfang
      // Hier könnte optional eine Capture-Liste geparst werden, z.B. [=, &var]
      // Fürs Erste nehmen wir eine leere Capture-Klausel an.
      this.CONSUME(RBracket); // Capture-Klausel Ende

      this.CONSUME(LParen);   // Parameterliste Anfang
      this.OPTION1(() => {    // Parameter sind optional (Suffix 1 für Eindeutigkeit)
        this.SUBRULE(this.parameterList, { LABEL: "lambdaParameters" });
      });
      this.CONSUME(RParen);   // Parameterliste Ende

      // Hier könnten optional mutable, exception spec, attributes, trailing return type -> Type geparst werden.

      this.SUBRULE(this.block, { LABEL: "lambdaBody" }); // Block-Körper
    });

    this.primaryExpression = this.RULE("primaryExpression", () => {
      this.OR([
        { ALT: () => this.CONSUME(Number) },
        { ALT: () => this.CONSUME(StringLiteral) },
        { ALT: () => this.CONSUME(Null) },
        { // Lambda-Ausdruck (C++-Stil) - VOR arrayLiteral
          GATE: () => this.LA(1).tokenType === LBracket && this.LA(2).tokenType === RBracket && this.LA(3).tokenType === LParen,
          ALT: () => this.SUBRULE(this.lambdaExpression)
        },
        { // Array-Literal
          GATE: () => this.LA(1).tokenType === LBracket,
          ALT: () => this.SUBRULE(this.arrayLiteral)
        },
        { // Objekt-Literal NEU
          GATE: () => this.LA(1).tokenType === LBrace,
          ALT: () => this.SUBRULE(this.objectLiteral)
        },
        { ALT: () => this.CONSUME(Identifier) },
        {
          ALT: () => {
            this.CONSUME(LParen);
            this.SUBRULE(this.expression);
            this.CONSUME(RParen);
          }
        }
      ]);
    });

    this.arrayLiteral = this.RULE("arrayLiteral", () => {
      this.CONSUME(LBracket);
      this.OPTION(() => {
        this.SUBRULE(this.argumentList); // Wiederverwendung von argumentList für kommagetrennte Ausdrücke
      });
      this.CONSUME(RBracket);
    });

    this.postfixExpression = this.RULE("postfixExpression", () => {
      // Beginnt mit einem primären Ausdruck
      this.SUBRULE(this.primaryExpression, { LABEL: "operand" });
      // Dann beliebig viele Postfix-Operationen (Member-Zugriff, Funktionsaufruf, Inkrement/Dekrement)
      this.MANY(() => {
        this.OR([
          { // Member-Zugriff: expression.identifier
            GATE: () => this.LA(1).tokenType === Dot,
            ALT: () => {
              this.CONSUME(Dot);
              this.CONSUME(Identifier, { LABEL: "memberIdentifier" });
            }
          },
          { // Funktionsaufruf: expression(argumentList?)
            GATE: () => this.LA(1).tokenType === LParen,
            ALT: () => {
              this.CONSUME(LParen);
              this.OPTION(() => {
                this.SUBRULE(this.argumentList);
              });
              this.CONSUME(RParen);
            }
          },
          { // Postfix Increment: expression++
            GATE: () => this.LA(1).tokenType === Increment,
            ALT: () => this.CONSUME(Increment)
          },
          { // Postfix Decrement: expression--
            GATE: () => this.LA(1).tokenType === Decrement,
            ALT: () => this.CONSUME(Decrement)
          },
          { // NEU: Array-Zugriff (indexer): expression[expression]
            GATE: () => this.LA(1).tokenType === LBracket,
            ALT: () => {
              this.CONSUME(LBracket);
              this.SUBRULE(this.expression, { LABEL: "indexExpression" });
              this.CONSUME(RBracket);
            }
          }
        ]);
      });
    });

    this.unaryExpression = this.RULE("unaryExpression", () => {
      this.OR([
        { // Prefix ++
          GATE: () => this.LA(1).tokenType === Increment,
          ALT: () => {
            this.CONSUME(Increment);
            this.CONSUME(Identifier); // Spezifisch für ++Identifier
          }
        },
        { // Prefix --
          GATE: () => this.LA(1).tokenType === Decrement,
          ALT: () => {
            this.CONSUME(Decrement);
            this.CONSUME2(Identifier); // Spezifisch für --Identifier, Suffix hinzugefügt
          }
        },
        { // Unäres Minus
          GATE: () => this.LA(1).tokenType === Minus,
          ALT: () => {
            this.CONSUME(Minus);
            this.SUBRULE(this.unaryExpression, { LABEL: "operand" }); // z.B. -x oder -(a+b)
          }
        },
        { // Fallback zu Postfix-Ausdrücken (die primäre Ausdrücke beinhalten)
          ALT: () => this.SUBRULE(this.postfixExpression)
        }
      ]);
    });

    this.multiplicativeExpression = this.RULE("multiplicativeExpression", () => {
      this.SUBRULE(this.unaryExpression, { LABEL: "lhs" }); // Geändert von atomicExpression/primaryExpression
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(Multiply) },
          { ALT: () => this.CONSUME(Divide) }
        ]);
        this.SUBRULE2(this.unaryExpression, { LABEL: "rhs" }); // Geändert
      });
    });

    this.additiveExpression = this.RULE("additiveExpression", () => {
      this.SUBRULE(this.multiplicativeExpression, { LABEL: "lhs" });
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(Plus) },
          { ALT: () => this.CONSUME(Minus) }
        ]);
        this.SUBRULE2(this.multiplicativeExpression, { LABEL: "rhs" });
      });
    });

    this.relationalExpression = this.RULE("relationalExpression", () => {
      this.SUBRULE(this.additiveExpression, { LABEL: "lhs" });
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(LessThan) },
          { ALT: () => this.CONSUME(GreaterThan) },
          { ALT: () => this.CONSUME(LessEqual) },
          { ALT: () => this.CONSUME(GreaterEqual) }
        ]);
        this.SUBRULE2(this.additiveExpression, { LABEL: "rhs" });
      });
    });

    this.equalityExpression = this.RULE("equalityExpression", () => {
      this.SUBRULE(this.relationalExpression, { LABEL: "lhs" });
      this.MANY(() => {
        this.OR([
          { ALT: () => this.CONSUME(EqualEqual) },
          { ALT: () => this.CONSUME(NotEqual) }
        ]);
        this.SUBRULE2(this.relationalExpression, { LABEL: "rhs" });
      });
    });

    // NEU: logicalAndExpression
    this.logicalAndExpression = this.RULE("logicalAndExpression", () => {
      this.SUBRULE(this.equalityExpression, { LABEL: "lhs" });
      this.MANY(() => {
        this.CONSUME(LogicalAnd);
        this.SUBRULE2(this.equalityExpression, { LABEL: "rhs" });
      });
    });

    // NEU: logicalOrExpression
    this.logicalOrExpression = this.RULE("logicalOrExpression", () => {
      this.SUBRULE(this.logicalAndExpression, { LABEL: "lhs" });
      this.MANY(() => {
        this.CONSUME(LogicalOr);
        this.SUBRULE2(this.logicalAndExpression, { LABEL: "rhs" });
      });
    });

    // MODIFIZIERT: assignmentExpression - konsumiert jetzt logicalOrExpression
    this.assignmentExpression = this.RULE("assignmentExpression", () => {
      this.SUBRULE(this.logicalOrExpression, { LABEL: "lhs" }); // Geändert von equalityExpression
      this.OPTION(() => {
        this.OR([
          { ALT: () => this.CONSUME(Equals) },
          { ALT: () => this.CONSUME(PlusEquals) },
          { ALT: () => this.CONSUME(MinusEquals) }
        ]);
        this.SUBRULE2(this.assignmentExpression, { LABEL: "rhs" }); // RHS bleibt assignmentExpression für Verkettung
      });
    });

    this.expression = this.RULE("expression", () => {
      this.SUBRULE(this.assignmentExpression);
    });

    this.argumentList = this.RULE("argumentList", () => {
      this.SUBRULE(this.expression);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.expression);
      });
    });

    // functionCall wird durch postfixExpression behandelt, wenn es einem Identifier oder Member-Zugriff folgt.
    // Diese separate Regel kann für einfache direkte Funktionsaufrufe beibehalten oder entfernt werden,
    // wenn alle Aufrufe über postfixExpression gehen. Fürs Erste belassen.
    this.functionCall = this.RULE("functionCall", () => {
      this.CONSUME(Identifier);
      this.CONSUME(LParen);
      this.OPTION(() => {
        this.SUBRULE(this.argumentList);
      });
      this.CONSUME(RParen);
    });


    // --- Top-Level Regeln ---

    this.typeDefinition = this.RULE("typeDefinition", () => {
      this.CONSUME(Typedef);
      this.SUBRULE(this.typeSpecifier, { LABEL: "originalType" }); // z.B. das erste 'int'

      this.OR([
        { // Einfacher Typedef: typedef oldType newType;
          GATE: () => this.LA(1).tokenType === Identifier && this.LA(2).tokenType === Semicolon,
          ALT: () => {
            this.CONSUME(Identifier, { LABEL: "newTypeName" });
          }
        },
        { // Typedef für Funktionszeiger: typedef returnType (*nameOpt)(params) newTypeName;
          // Oder wie in Ihrem Fall: typedef returnType (*)(params) newTypeName;
          ALT: () => {
            this.CONSUME(LParen);
            this.CONSUME(Multiply); // Der Stern für den Zeiger
            // Optionaler Name innerhalb der Funktionszeiger-Deklaration des Typedefs (oft weggelassen)
            this.OPTION(() => {
              this.CONSUME1(Identifier, { LABEL: "functionPointerInternalName" });
            });
            this.CONSUME(RParen);
            this.CONSUME2(LParen); // Parameterliste des Funktionszeigers
            this.OPTION1(() => {
              this.SUBRULE(this.parameterList, { LABEL: "functionPointerParameterList" });
            });
            this.CONSUME3(RParen);
            this.CONSUME2(Identifier, { LABEL: "newTypeName" }); // Der eigentliche Name des Typedefs
          }
        }
      ]);
      this.CONSUME(Semicolon);
    });

    this.program = this.RULE("program", () => {
      this.MANY(() => {
        this.OR([
          {
            GATE: () => this.LA(1).tokenType === Typedef,
            ALT: () => this.SUBRULE(this.typeDefinition)
          },
          {
            // GATE für functionDefinition
            GATE: () => {
              let lookaheadIndex = 1;
              const firstToken = this.LA(lookaheadIndex).tokenType;

              const isValidStartType = isPrimitiveType(firstToken) || firstToken === Void || firstToken === Identifier;
              if (!isValidStartType) return false;
              lookaheadIndex++;

              if (this.LA(lookaheadIndex).tokenType === LBracket) {
                if (this.LA(lookaheadIndex + 1).tokenType === RBracket) {
                  lookaheadIndex += 2;
                } else {
                  return false;
                }
              }

              if (this.LA(lookaheadIndex).tokenType !== Identifier) return false; // Funktionsname
              lookaheadIndex++;

              return this.LA(lookaheadIndex).tokenType === LParen; // Erwartet ( für Parameter
            },
            ALT: () => this.SUBRULE(this.functionDefinition)
          },
          {
            // GATE für variableDeclaration
            GATE: () => {
              let laIdx = 1;
              if (this.LA(laIdx).tokenType === Const) {
                laIdx++;
              }

              const typeStartToken = this.LA(laIdx).tokenType;
              if (!(isPrimitiveType(typeStartToken) || typeStartToken === Void || typeStartToken === Identifier)) {
                return false;
              }
              laIdx++; // Nach dem ersten Teil des Typs (z.B. Int, Identifier)

              // Berücksichtige optionale Array-Klammern des Typs (z.B. int[])
              if (this.LA(laIdx).tokenType === LBracket && this.LA(laIdx + 1).tokenType === RBracket) {
                laIdx += 2;
              }

              // Erwarte den Variablennamen (Identifier)
              if (this.LA(laIdx).tokenType !== Identifier) return false;
              laIdx++; // Nach dem Variablennamen

              // Was folgt? Entweder Initialisierung `=`, Semikolon `;`
              // oder C-Style Array-Klammern `[]` nach dem Namen.
              const nextToken = this.LA(laIdx).tokenType;
              if (nextToken === Equals || nextToken === Semicolon) {
                return true;
              }
              // Für C-Style `int arr[] = ...` oder `int arr[];`
              // Dies ist relevant, wenn die variableDeclaration Regel `name[]` unterstützt.
              if (nextToken === LBracket && this.LA(laIdx + 1).tokenType === RBracket) {
                const tokenAfterBrackets = this.LA(laIdx + 2).tokenType;
                if (tokenAfterBrackets === Equals || tokenAfterBrackets === Semicolon) {
                  return true;
                }
              }
              return false;
            },
            ALT: () => this.SUBRULE(this.variableDeclaration)
          },
          {
            // NEU: GATE für expressionStatement
            // Diese Regel sollte zutreffen, wenn die spezifischeren Regeln für
            // Funktions- oder Variablendeklarationen nicht gepasst haben.
            // Ein Top-Level ExpressionStatement beginnt oft mit einem Identifier
            // gefolgt von '.', '(', '[', '=', '++', '--', etc.
            GATE: () => {
              const t1 = this.LA(1).tokenType;
              const t2 = this.LA(2).tokenType;

              if (t1 === Identifier) {
                // Beispiele:
                // $.on = ...         (Identifier Dot)
                // myFunction();       (Identifier LParen)
                // myArray[0] = 1;   (Identifier LBracket)
                // i = 0;            (Identifier Equals)
                // i++;              (Identifier Increment)
                // i--;              (Identifier Decrement)
                return t2 === Dot || t2 === LParen || t2 === LBracket ||
                       t2 === Equals || t2 === PlusEquals || t2 === MinusEquals ||
                       t2 === Increment || t2 === Decrement;
              }
              // Beispiele: ++i; oder --i;
              if ((t1 === Increment || t1 === Decrement) && t2 === Identifier) {
                return true;
              }
              // Andere Anfänge von Ausdrücken (Literale, geklammerte Ausdrücke)
              // sind auf Top-Level seltener als eigenständige Statements
              // und könnten zu allgemein sein, wenn hier nicht sorgfältig behandelt.
              return false;
            },
            ALT: () => this.SUBRULE(this.expressionStatement)
          }
        ]);
      });
    });

    this.functionDefinition = this.RULE("functionDefinition", () => {
      this.SUBRULE(this.typeSpecifier);
      this.CONSUME(Identifier); // Funktionsname
      this.CONSUME(LParen);
      this.OPTION(() => {
        this.SUBRULE(this.parameterList);
      });
      this.CONSUME(RParen);
      // Entweder ein Block oder eine Arrow-Funktion
      this.OR([
        { ALT: () => this.SUBRULE(this.block) }, // Regulärer Funktionsblock
        { // Arrow-Funktionssyntax
          ALT: () => {
            this.CONSUME(Arrow);
            this.SUBRULE(this.expression);
            this.CONSUME(Semicolon);
          }
        }
      ]);
    });

    this.parameterList = this.RULE("parameterList", () => {
      this.SUBRULE(this.parameter);
      this.MANY(() => {
        this.CONSUME(Comma);
        this.SUBRULE2(this.parameter); // Suffix 2 ist korrekt hier
      });
    });

    this.parameter = this.RULE("parameter", () => {
      this.OR([
        { // Einfaches 'void' als Parameter, z.B. int main(void)
          GATE: () => this.LA(1).tokenType === Void && this.LA(2).tokenType === RParen,
          ALT: () => this.CONSUME(Void)
        },
        { // Funktionszeiger als Parameter, z.B. int (*callback)(int)
          GATE: () => {
            const la1 = this.LA(1).tokenType;
            const la2 = this.LA(2).tokenType;
            const la3 = this.LA(3).tokenType;
            const la4 = this.LA(4).tokenType;
            const la5 = this.LA(5).tokenType; // Nötig für die schließende Klammer des Zeigernamens
            const isPotentialType = la1 === Int || la1 === Float || la1 === String || la1 === Void || la1 === Identifier;
            // Prüft auf Type ( * Identifier ) (
            return isPotentialType && la2 === LParen && la3 === Multiply && la4 === Identifier && la5 === RParen && this.LA(6).tokenType === LParen;
          },
          ALT: () => {
            this.SUBRULE(this.typeSpecifier, { LABEL: "returnType" });
            this.CONSUME(LParen);
            this.CONSUME(Multiply);
            this.CONSUME(Identifier, { LABEL: "pointerName" });
            this.CONSUME(RParen);
            this.CONSUME2(LParen);
            this.OPTION(() => { // Erste OPTION (kann OPTION1 sein oder ohne Suffix, wenn die andere einen hat)
              // Wichtig: Die Parameterliste des Funktionszeigers kann auch Parameter ohne Namen enthalten
              this.SUBRULE2(this.parameterList, { LABEL: "functionPointerParameterList" });
            });
            this.CONSUME3(RParen);
          }
        },
        { // Regulärer Parameter: Type (Identifier)?
          ALT: () => {
            this.SUBRULE2(this.typeSpecifier, { LABEL: "simpleType" }); // Suffix 2
            this.OPTION1(() => { // Der Name des Parameters ist optional - Suffix hinzugefügt (OPTION1)
              this.CONSUME2(Identifier, { LABEL: "simpleName" });    // Suffix 2
            });
          }
        }
      ]);
    });

    this.block = this.RULE("block", () => {
      this.CONSUME(LBrace);
      this.MANY(() => {
        this.SUBRULE(this.statement);
      });
      this.CONSUME(RBrace);
    });

    this.statement = this.RULE("statement", () => {
      this.OR([
        {
          GATE: () => { // GATE für variableDeclaration
            let laIdx = 1;
            if (this.LA(laIdx).tokenType === Const) {
              laIdx++;
            }
            const firstToken = this.LA(laIdx).tokenType;
            const isPotentiallyType = firstToken === Int || firstToken === Float || firstToken === String || firstToken === Void || firstToken === Auto || firstToken === Identifier;

            if (!isPotentiallyType) return false;

            // Nächstes Token nach dem Typ
            let nextTokenIdx = laIdx + 1;
            let nextToken = this.LA(nextTokenIdx).tokenType;

            // Prüfen auf 'Type Identifier'
            if (nextToken === Identifier) return true;

            // Prüfen auf 'Type [] Identifier'
            if (nextToken === LBracket && this.LA(nextTokenIdx + 1).tokenType === RBracket && this.LA(nextTokenIdx + 2).tokenType === Identifier) {
              return true;
            }
            return false;
          },
          ALT: () => this.SUBRULE(this.variableDeclaration)
        },
        {
          GATE: () => this.LA(1).tokenType === Identifier && (this.LA(2).tokenType === Equals || this.LA(2).tokenType === PlusEquals || this.LA(2).tokenType === MinusEquals),
          ALT: () => this.SUBRULE(this.assignmentStatement)
        },
        { ALT: () => this.SUBRULE(this.returnStatement) },
        { ALT: () => this.SUBRULE(this.ifStatement) },
        { ALT: () => this.SUBRULE(this.forStatement) },
        // ExpressionStatement als Fallback für alles andere, was ein Ausdruck gefolgt von Semikolon ist
        { ALT: () => this.SUBRULE(this.expressionStatement) }
      ]);
    });

    this.variableDeclaration = this.RULE("variableDeclaration", () => {
      this.OPTION(() => this.CONSUME(Const));
      this.SUBRULE(this.typeSpecifier);
      this.CONSUME(Identifier);
      // Optionale Array-Klammern nach dem Identifier (für C-Style `int arr[]`)
      // Wenn typeSpecifier bereits [] verarbeitet, ist dies möglicherweise redundant oder für einen anderen Stil
      this.OPTION1(() => { // Suffix 1, da oben schon eine OPTION in typeSpecifier ist
        this.CONSUME(LBracket);
        this.CONSUME(RBracket);
      });
      this.OPTION2(() => { // Suffix 2 für die Initialisierung
        this.CONSUME(Equals);
        this.SUBRULE(this.expression);
      });
      this.CONSUME(Semicolon);
    });

    this.assignmentStatement = this.RULE("assignmentStatement", () => {
      this.CONSUME(Identifier);
      this.OR([
        { ALT: () => this.CONSUME(Equals) },
        { ALT: () => this.CONSUME(PlusEquals) },
        { ALT: () => this.CONSUME(MinusEquals) },
      ]);
      this.SUBRULE(this.expression);
      this.CONSUME(Semicolon);
    });

    // NEUE REGEL für einzelne Eigenschaften eines Objektliterals
    this.objectProperty = this.RULE("objectProperty", () => {
      this.CONSUME(Identifier, { LABEL: "key" });
      this.CONSUME(Equals);
      this.SUBRULE(this.expression, { LABEL: "value" });
    });

    // NEUE REGEL für Objektliterale
    this.objectLiteral = this.RULE("objectLiteral", () => {
      this.CONSUME(LBrace);
      this.OPTION(() => {
        this.SUBRULE(this.objectProperty);
        this.MANY(() => {
          this.CONSUME(Comma);
          this.SUBRULE2(this.objectProperty); // Wichtig: SUBRULE2 für nachfolgende
        });
      });
      this.CONSUME(RBrace);
    });

    this.expressionStatement = this.RULE("expressionStatement", () => {
      this.SUBRULE(this.expression);
      this.CONSUME(Semicolon);
    });

    this.returnStatement = this.RULE("returnStatement", () => {
      this.CONSUME(Return);
      this.OPTION(() => {
        this.SUBRULE(this.expression);
      });
      this.CONSUME(Semicolon);
    });

    this.ifStatement = this.RULE("ifStatement", () => {
      this.CONSUME(If);
      this.CONSUME(LParen);
      this.SUBRULE(this.expression);
      this.CONSUME(RParen);
      this.SUBRULE(this.block, { LABEL: "thenBlock" });
      this.OPTION(() => {
        this.CONSUME(Else);
        this.OR([
          {
            GATE: () => this.LA(1).tokenType === If,
            ALT: () => this.SUBRULE(this.ifStatement, { LABEL: "elseIfStatement" })
          },
          {
            ALT: () => this.SUBRULE2(this.block, { LABEL: "elseBlock" })
          }
        ]);
      });
    });

    this.forStatement = this.RULE("forStatement", () => {
      this.CONSUME(For);
      this.CONSUME(LParen);

      this.OR([
        {
          GATE: () => { // GATE für Deklarationsteil im for
            let laIdx = 1;
            if (this.LA(laIdx).tokenType === Const) {
              laIdx++;
            }
            const firstToken = this.LA(laIdx).tokenType;
            const isPotentiallyType = firstToken === Int || firstToken === Float || firstToken === String || firstToken === Void || firstToken === Auto || firstToken === Identifier;

            if (!isPotentiallyType) return false;

            let nextTokenIdx = laIdx + 1;
            let nextToken = this.LA(nextTokenIdx).tokenType;

            // Prüfen auf 'Type Identifier'
            if (nextToken === Identifier) return true;

            // Prüfen auf 'Type [] Identifier'
            if (nextToken === LBracket && this.LA(nextTokenIdx + 1).tokenType === RBracket && this.LA(nextTokenIdx + 2).tokenType === Identifier) {
              return true;
            }
            return false;
          },
          ALT: () => {
            this.OPTION(() => this.CONSUME(Const));
            this.SUBRULE(this.typeSpecifier);
            this.CONSUME(Identifier);
            this.OPTION1(() => {
              this.CONSUME(Equals);
              this.SUBRULE(this.expression, { LABEL: "initExpression" }); // LABEL HINZUGEFÜGT
            });
          }
        },
        {
          ALT: () => this.OPTION2(() => this.SUBRULE2(this.expression, { LABEL: "initExpression" })) // LABEL HINZUGEFÜGT
        }
      ]);

      this.CONSUME(Semicolon);
      this.OPTION3(() => this.SUBRULE3(this.expression, { LABEL: "testExpression" })); // LABEL HINZUGEFÜGT
      this.CONSUME2(Semicolon);
      this.OPTION4(() => this.SUBRULE4(this.expression, { LABEL: "updateExpression" })); // LABEL HINZUGEFÜGT
      this.CONSUME(RParen);
      this.SUBRULE(this.block);
    });

    this.performSelfAnalysis();
  }
}

// === HAUPT-PARSE-FUNKTION ===
export function parseCode(input) {
  // Tokenisieren
  const lexResult = CLanguageLexer.tokenize(input);
  
  // Lexer-Fehler prüfen
  if (lexResult.errors.length > 0) {
    throw new Error("Lexer errors:\n" + lexResult.errors.map(e => e.message).join("\n"));
  }

  // Neue Parser-Instanz für jeden Parse-Vorgang
  const parser = new CLanguageParser();
  parser.input = lexResult.tokens;
  
  // Parsen
  const cst = parser.program();
  
  // Parser-Fehler prüfen
  if (parser.errors.length > 0) {
    throw new Error("Parser errors:\n" + parser.errors.map(e => e.message).join("\n"));
  }
  
  return {
    cst,
    tokens: lexResult.tokens,
    lexErrors: lexResult.errors,
    parseErrors: parser.errors
  };
}

// Export der Parser-Klasse für erweiterte Nutzung
export { CLanguageParser, CLanguageLexer, allTokens };
