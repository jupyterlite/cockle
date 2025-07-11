#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

int argsInclude(int argc, char** argv, char* check) {
  for (int i = 1; i < argc; i++) {
    if (strcmp(argv[i], check) == 0) {
      return 1;
    }
  }
  return 0;
}

int main(int argc, char** argv) {
  if (argsInclude(argc, argv, "name")) {
    printf("%s\n", argv[0]);
  }

  if (argsInclude(argc, argv, "stdout")) {
    printf("Output line 1\n");
    printf("Output line 2\n");
  }

  if (argsInclude(argc, argv, "stderr")) {
    fprintf(stderr, "Error message\n");
  }

  if (argsInclude(argc, argv, "color")) {
    int useColor = isatty(fileno(stdout));
    for (int j = 0; j < 16; j++) {
      for (int i = 0; i < 32; i++) {
        // r,g,b in range 0 to 255 inclusive.
        int r = (32-i)*8 - 1;
        int g = 128;
        int b = (16-j)*16 - 1;
        if (useColor) {
          printf("\e[38;2;%i;%i;%im", r, g, b);  // RGB color.
        }
        printf("%c", 65+i);
        if (useColor) {
          printf("\e[1;0m");  // Reset color.
        }
      }
      printf("\n");
    }
  }

  if (argsInclude(argc, argv, "stdin")) {
    // Read until EOF, echoing back as upper case.
    while (1) {
      int ch = getchar();
      if (ch == EOF) {
        break;
      } else {
        putchar(toupper(ch));
        fflush(stdout);
      }
    }
  }

  if (argsInclude(argc, argv, "readfile")) {
    // Read from file and echo content to stdout.
    const char* filename = "readfile.txt";
    FILE* fp = fopen(filename, "r");
    if (fp == NULL) {
      fprintf(stderr, "Unable to open file %s for reading", filename);
      return 1;
    }
    char buffer[10];
    size_t count = 0;
    do {
      count = fread(buffer, sizeof(buffer[0]), sizeof(buffer)/sizeof(buffer[0]), fp);
      fwrite(buffer, sizeof(buffer[0]), count, stdout);
    } while (count > 0);
    fflush(stdout);
    fclose(fp);
  }

  if (argsInclude(argc, argv, "writefile")) {
    const char* filename = "writefile.txt";
    FILE* fp = fopen(filename, "w");
    if (fp == NULL) {
      fprintf(stderr, "Unable to open file %s for writing", filename);
      return 1;
    }
    fprintf(fp, "File written by wasm-test");
    fclose(fp);
  }

  if (argsInclude(argc, argv, "exitCode")) {
    return 1;
  }
  return 0;
}
