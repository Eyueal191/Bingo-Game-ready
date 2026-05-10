import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  CardContent,
  CardHeader,
  Typography,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  HelpOutline,
  EmojiEvents,
  People,
  Lightbulb,
  CardGiftcard,
  AccountBalanceWallet,
  MonetizationOn,
} from "@mui/icons-material";

const HowToPlay = () => {
  return (
    <div className="min-h-screen dynamic-bg">
      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 pb-20">
        <div className="mb-8 text-center">
          {/* <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">የቢንጎ መጫወቻ መመሪያ</h1> */}
          <p className="text-white/80 text-lg">የቢንጎን ለመጫወት መሰረታዊ መመሪያ</p>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Game Instructions Card */}
          <Card className="bg-white/10 backdrop-blur-md border border-purple-500/20 mb-8 shadow-lg rounded-lg">
            <CardContent>
              <Accordion className="bg-transparent border-0">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon className="text-purple-500" />}
                  className="text-white hover:text-purple-500"
                >
                  <div className="flex items-center ">
                    <HelpOutline className="mr-2 text-purple-500" />
                    <Typography>እንዴት መጫወት እንችላለን?</Typography>
                  </div>
                </AccordionSummary>
                <AccordionDetails className=" text-gray-500">
                  <Typography className="pl-7 ">
                    {/* በየ10 ደቂቃው የሚጀምር ጨዋታ ነው  */}
                    መጀመሪያ የሚፈልጉትን የካርድ ብዛት ይምረጡ ከዛ በመረጡት መጠን መወራረድ ይጀምራሉ ከዛ
                    በመጫወቻ ሜዳ ውስጥ ይገባሉ።
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion className="bg-transparent border-0">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon className="text-purple-500" />}
                  className="text-white hover:text-purple-500"
                >
                  <div className="flex items-center">
                    <EmojiEvents className="mr-2 text-purple-500" />
                    <Typography>እንዴት ማሸነፍ እንችላለን?</Typography>
                  </div>
                </AccordionSummary>
                <AccordionDetails className=" text-gray-500">
                  <Typography className="pl-7">
                    የሚጠሩትን ቁጥሮች በእርስዎ ካርድ ላይ እየነኩ ሄደው አንድ መስመር ወይም 4ኮርነር ከሰሩ
                    አሸናፊ ይሆናሉ።
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion className="bg-transparent border-0">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon className="text-purple-500" />}
                  className="text-white hover:text-purple-500"
                >
                  <div className="flex items-center">
                    <People className="mr-2 text-purple-500" />
                    <Typography>አንድ አሸናፊ ብቻ ነው የሚኖረው?</Typography>
                  </div>
                </AccordionSummary>
                <AccordionDetails className=" text-gray-500">
                  <Typography className="pl-7">
                    በ አንድ ጨዋታ ከአንድ በላይ አሸናፊ ሊኖር ይችላል ማለትም ከአንድ በላይ ሰዎች እኩል ሊዘጉ
                    ይችላሉ ይህም ከሆነ የደራሽ መጠንን የሚካፈሉት ይሆናል።
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion className="bg-transparent border-0">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon className="text-purple-500" />}
                  className="text-white hover:text-purple-500"
                >
                  <div className="flex items-center">
                    <Lightbulb className="mr-2 text-purple-500" />
                    <Typography>ምን አይነት ጨዋታዎች አሉ?</Typography>
                  </div>
                </AccordionSummary>
                <AccordionDetails className=" text-gray-500">
                  <Typography className="pl-7">
                    በBingo እንዲጫወቱ ሊረዱዎ የሚችሉ የተለያዩ ጨዋታዎች አሉን። ይህም የተለያዩ
                    የካርድ ብዛት እና የገንዘብ ሽልማቶችን ያካትታል። ለታዳሽ ተጫዋቾች ያሉ ልዩ ጨዋታዎችም አሉን።
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion className="bg-transparent border-0">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon className="text-purple-500" />}
                  className="text-white hover:text-purple-500"
                >
                  <div className="flex items-center">
                    <MonetizationOn className="mr-2 text-purple-500" />
                    <Typography>እንዴት ገንዘብ ማስገባት እችላለሁ?</Typography>
                  </div>
                </AccordionSummary>
                <AccordionDetails className=" text-gray-500">
                  <Typography className="pl-7">
                    ጨዋታዎችን ለመጫወት ገንዘብ ማስገባት ይችላሉ። ይህንን ለማድረግ ከላይኛው ቀኝ በኩል ባለው
                    የመገልገያ ቦታ ላይ ያለውን "Wallet" አማራጭ ይጠቀሙ። ከዚያ የተለያዩ የክፍያ ዘዴዎችን
                    መምረጥ ይችላሉ።
                  </Typography>
                </AccordionDetails>
              </Accordion>

              <Accordion className="bg-transparent border-0">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon className="text-purple-500" />}
                  className="text-white hover:text-purple-500"
                >
                  <div className="flex items-center">
                    <AccountBalanceWallet className="mr-2 text-purple-500" />{" "}
                    {/* Updated icon for withdrawal */}
                    <Typography>ገንዘብ Withdraw ለማድረግ ምን ማድረግ አለብኝ?</Typography>
                  </div>
                </AccordionSummary>
                <AccordionDetails className="text-gray-500">
                  <Typography component="div" className="pl-7">
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <span className="text-purple-500 mr-3">🎯</span>
                        <span>በትንሹ ማውጣት የሚችሉት 100ብር መሆን አለበት።</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-purple-500 mr-3">💸</span>
                        <span>ወጪ ሲያደርጉ ከዋሌትዎ ቢያንስ 10 ብር ቀሪ ሊኖር ይገባል።</span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-purple-500 mr-3">💰</span>
                        <span>
                          ከዚህ በፊት ቢያንስ 1 ጊዜ Deposit አድርገን የምናውቅ መሆን አለበት።
                        </span>
                      </div>
                      <div className="flex items-start">
                        <span className="text-purple-500 mr-3">🏆</span>
                        <span>ቢያንስ 1 ጊዜ ማሸነፍ ይኖርብዎታል።</span>
                      </div>
                    </div>
                  </Typography>
                </AccordionDetails>
              </Accordion>
              <Accordion className="bg-transparent border-0">
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon className="text-purple-500" />}
                  className="text-white hover:text-purple-500"
                >
                  <div className="flex items-center">
                    <CardGiftcard className="mr-2 text-purple-500" />
                    <Typography>ጥቅማ ጥቅሞች አሉ?</Typography>
                  </div>
                </AccordionSummary>
                <AccordionDetails className=" text-gray-500">
                  <Typography className="pl-7">
                    አዎ፣ በBingo ለአዲስ እና ለመደበኛ ተጫዋቾች የተለያዩ ጥቅማ ጥቅሞች አሉን። ይህም
                    የመጀመሪያ ገንዘብ ማስገቢያ ጥቅማ ጥቅሞችን፣ ነፃ ካርዶችን፣ እና ሌሎች ልዩ ሽልማቶችን
                    ያካትታል።
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </CardContent>
          </Card>

          {/* Winning Patterns Card */}
          <Card className="bg-white/10 backdrop-blur-md border border-purple-500/20 shadow-lg rounded-lg">
            <CardHeader
              title={
                <Typography className=" text-gray-500 text-center text-2xl font-semibold">
                  Winning Patterns
                </Typography>
              }
              className="pb-2"
            />
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Horizontal Line */}
                <div className="p-4 bg-black/5 rounded-lg border border-black/10">
                  <h3 className=" text-gray-500  font-semibold mb-2 flex items-center">
                    <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-2 text-purple-500 font-bold">
                      1
                    </span>
                    Horizontal Line
                  </h3>
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {[...Array(25)].map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded flex items-center justify-center text-sm font-medium ${Math.floor(i / 5) === 2
                            ? "bg-blue-500 text-white border-blue-700 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                            : "bg-black/10 text-white/60"
                          }`}
                      >
                        {i + 1 === 13 ? "F" : i + 1}
                      </div>
                    ))}
                  </div>
                  <Typography className=" text-gray-400  text-sm">
                    Complete any horizontal line on your card
                  </Typography>
                </div>

                {/* Vertical Line */}
                <div className="p-4 bg-black/5 rounded-lg border border-black/10">
                  <h3 className="text-gray-500 font-semibold mb-2 flex items-center">
                    <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-2 text-purple-500 font-bold">
                      2
                    </span>
                    Vertical Line
                  </h3>
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {[...Array(25)].map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded flex items-center justify-center text-sm font-medium ${i % 5 === 2
                            ? "bg-blue-500 text-white border-blue-700 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                            : "bg-black/10 text-white/60"
                          }`}
                      >
                        {i + 1 === 13 ? "F" : i + 1}
                      </div>
                    ))}
                  </div>
                  <Typography className="text-gray-400 text-sm">
                    Complete any vertical line on your card
                  </Typography>
                </div>

                {/* Diagonal Line */}
                <div className="p-4 bg-black/5 rounded-lg border border-black/10">
                  <h3 className="text-gray-500 font-semibold mb-2 flex items-center">
                    <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-2 text-purple-500 font-bold">
                      3
                    </span>
                    Diagonal Line
                  </h3>
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {[...Array(25)].map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded flex items-center justify-center text-sm font-medium ${i === 0 || i === 6 || i === 12 || i === 18 || i === 24
                            ? "bg-blue-500 text-white border-blue-700 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                            : "bg-black/10 text-white/60"
                          }`}
                      >
                        {i + 1 === 13 ? "F" : i + 1}
                      </div>
                    ))}
                  </div>
                  <Typography className="text-gray-400 text-sm">
                    Complete any diagonal line on your card
                  </Typography>
                </div>

                {/* Four Corners */}
                <div className="p-4 bg-black/5 rounded-lg border border-black/10">
                  <h3 className="text-gray-500 font-semibold mb-2 flex items-center">
                    <span className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center mr-2 text-purple-500 font-bold">
                      4
                    </span>
                    Four Corners
                  </h3>
                  <div className="grid grid-cols-5 gap-1 mb-3">
                    {[...Array(25)].map((_, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded flex items-center justify-center text-sm font-medium ${i === 0 || i === 4 || i === 20 || i === 24
                            ? "bg-blue-500 text-white border-blue-700 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                            : "bg-black/10 text-white/60"
                          }`}
                      >
                        {i + 1 === 13 ? "F" : i + 1}
                      </div>
                    ))}
                  </div>
                  <Typography className="text-gray-400 text-sm">
                    Complete all four corners of your card
                  </Typography>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HowToPlay;
