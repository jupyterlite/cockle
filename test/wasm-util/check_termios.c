/*
 * Utility to test termios settings in cockle.
 *
 * Pass in termios flags to override the defaults, then it loops accepting a line of stdin at a
 * time and echoing it back to stdout. Use EOT (Ctrl-C, ascii 4) to stop.
 */

#include <getopt.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <termios.h>

#define BUFFER_SIZE 1024

int main(int argc, char** argv) {
  struct termios termiosOriginal, termiosModified;
  char buffer[BUFFER_SIZE];
  int optionIndex = 0;
  int iflag = -1;
  int oflag = -1;
  int option;

  static struct option longOptions[] =
  {
    {"iflag", required_argument, NULL, 'i'},
    {"oflag", required_argument, NULL, 'o'},
    {0, 0, 0, 0}
  };

  while ((option = getopt_long(argc, argv, "i:o:", longOptions, &optionIndex)) != -1) {
    switch (option) {
      case 'i':
        iflag = atoi(optarg);
        break;
      case 'o':
        oflag = atoi(optarg);
        break;
    }
  }

  // Change termios settings.
  tcgetattr(0, &termiosOriginal);
  tcgetattr(0, &termiosModified);
  if (iflag >= 0) {
    termiosModified.c_iflag = iflag;
  }
  if (oflag >= 0) {
    termiosModified.c_oflag = oflag;
  }
  tcsetattr(0, TCSANOW, &termiosModified);

  // Read and write a line at a time.
  while (1) {
    char* ret = fgets(buffer, BUFFER_SIZE, stdin);
    if (ret == NULL) {
      printf("End of input\n");
      break;
    }
    printf("%s", buffer);
  }

  // Restore original termios settings.
  tcsetattr(0, TCSANOW, &termiosOriginal);
  return 0;
}
