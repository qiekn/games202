#pragma once

#ifndef NOMINMAX
#define NOMINMAX
#endif

#include <iostream> // IWYU pragma: keep

#define LOG(msg) std::cout << "[" << __FILE__ << ", " << __FUNCTION__ << ", " << __LINE__ << "]: " << msg << std::endl;

#define CHECK(cond)          \
  do {                       \
    if (!(cond)) {           \
      LOG("Runtime Error."); \
      exit(-1);              \
    }                        \
  } while (false)
