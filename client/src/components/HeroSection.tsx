import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
const HeroSection = () => {
  return (
    <section className="py-16">
      <div className="container">
        <div className="flex flex-col rounded-xl border lg:flex-row  bg-muted ">
          <div className="grow px-8 py-8 lg:px-16">
            <div className="mt-4 max-w-xl">
              <h2 className="text-2xl font-semibold md:text-3xl">
                "So then, brothers, stand firm and hold to the traditions that
                you were taught by us, either by our spoken word or by our
                letter."
              </h2>
              <p className="mt-4 text-muted-foreground md:text-lg">
                2 Thessalonians 2:15
              </p>
            </div>

          </div>
          <div className="flex grow basis-5/12 flex-col justify-between border-t lg:border-t-0 lg:border-l">
            <div className="grow px-8 py-8 lg:px-16">
              <div className="mt-4 max-w-xl">
                <p className="mb-8 text-muted-foreground lg:text-lg">
                  Welcome to Tewahedo Answers, a platform dedicated to answering
                  questions about the Ethiopian Orthodox Tewahedo Faith.
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                  <Button className="bg-[#e26826] hover:bg-[#9a3e21] text-white px-6">
                    <Link href="/ask">
                      Ask a Question
                    </Link>
                  </Button>
                </div> 
              </div>
            </div>
            <Separator />
          </div>
        </div>
      </div> 
    </section>
  );
};

export default HeroSection;
