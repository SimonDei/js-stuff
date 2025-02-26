  const mat1 = new DOMMatrix();
  mat1.translateSelf(x, y, 0);
  mat1.rotateAxisAngleSelf(0, 0, 1, rotation);
  mat1.translateSelf(width / -2, height / -2, 0);
  mat1.scaleSelf(width, height, 1);
