import { SignUp } from "@clerk/nextjs";
import Image from "next/image";

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      {/* Banner oscuro con logo */}
      <div className="flex justify-center bg-[#0a0d14] py-8 px-4">
        <Image
          src="/GO-TO.png"
          alt="Go To Marketing"
          width={190}
          height={86}
          className="object-contain"
        />
      </div>

      {/* Formulario Clerk */}
      <div className="flex items-center justify-center px-4 py-10">
        <SignUp />
      </div>
    </div>
  );
}
